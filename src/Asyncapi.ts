import {AsyncAPIDocumentInterface, SchemaV2 as SchemaModel } from '@asyncapi/parser';
import * as vscode from 'vscode';
import * as ejs from 'ejs';
import * as path from 'path';
import * as Markdownit from 'markdown-it';
import { Server } from 'http';
import { sample } from 'openapi-sampler';

const md = Markdownit('commonmark');


const extRenderType = 'x-schema-private-render-type';
const extRenderAdditionalInfo = 'x-schema-private-render-additional-info';
const extRawValue = 'x-schema-private-raw-value';
const extParameterLocation = 'x-schema-private-parameter-location';
const jsonSchemaTypes: string[] = [
  'string',
  'number',
  'integer',
  'boolean',
  'array',
  'object',
  'null',
];

const RESTRICTED_ANY = 'restricted any';
const NEVER = 'never';
const UNKNOWN = 'unknown';
const ANY = 'any';
const jsonSchemaKeywordTypes = {
  maxLength: 'string',
  minLength: 'string',
  pattern: 'string',
  contentMediaType: 'string',
  contentEncoding: 'string',
  multipleOf: 'number',
  maximum: 'number',
  exclusiveMaximum: 'number',
  minimum: 'number',
  exclusiveMinimum: 'number',
  items: 'array',
  maxItems: 'array',
  minItems: 'array',
  uniqueItems: 'array',
  contains: 'array',
  additionalItems: 'array',
  maxProperties: 'object',
  minProperties: 'object',
  required: 'object',
  properties: 'object',
  patternProperties: 'object',
  propertyNames: 'object',
  dependencies: 'object',
  additionalProperties: 'object',
};

class SchemaHelper {

  static toSchemaType(schema: { json: () => boolean; isBooleanSchema: () => any; not: () => any; }):any {
    if (!schema || typeof schema.json !== 'function') {
      return UNKNOWN;
    }
    if (schema.isBooleanSchema()) {
      if (schema.json() === true) {
        return ANY;
      } 
      return NEVER;
    }
    // handle case with `{}` schemas
    if (Object.keys(schema.json()).length === 0) {
      return ANY;
    }
    // handle case with `{ not: {}, ... }` schemas
    const not = schema.not();
    if (not && this.inferType(not) === ANY) {
      return NEVER;
    }

    let type = this.inferType(schema);
    if (Array.isArray(type)) {
      return type.map(t => this.toType(t, schema)).join(' | ');
    }
    type = this.toType(type, schema);
    const combinedType = this.toCombinedType(schema);

    if (type && combinedType) {
      return `${type} ${combinedType}`;
    }
    if (combinedType) {
      return combinedType;
    }
    return type;
  }

  static toType(type: string, schema: { json?: () => boolean; isBooleanSchema?: () => any; not?: () => any; items?: any; additionalItems?: any; }) {
    if (type === 'array') {
      const items = schema.items();
      if (Array.isArray(items)) {
        const types = items.map(item => this.toSchemaType(item)).join(', ');
        const additionalItems = schema.additionalItems();
        if (additionalItems === true) {
          return `tuple<${types || UNKNOWN}, ...optional<${ANY}>>`;
        }
        if (additionalItems === false) {
          return `tuple<${types}>`;
        }
        const additionalType = this.toSchemaType(additionalItems);
        return `tuple<${types || UNKNOWN}, ...optional<${additionalType}>>`;
      }
      if (!items) {
        return `array<${ANY}>`;
      }
      return `array<${this.toSchemaType(items) || UNKNOWN}>`;
    }
    return type;
  }

  static toCombinedType(schema: { json?: () => boolean; isBooleanSchema?: () => any; not?: () => any; oneOf?: any; anyOf?: any; allOf?: any; }) {
    const t = [];
    if (schema.oneOf()) {
      t.push('oneOf');
    }
    if (schema.anyOf()) {
      t.push('anyOf');
    }
    if (schema.allOf()) {
      t.push('allOf');
    }
    if (t.length === 0 || t.length > 1) {
      return undefined;
    }
    return t[0];
  }

  static inferType(schema: { json: any; isBooleanSchema?: (() => any) | (() => any) | undefined; not?: (() => any) | (() => any) | undefined; type?: any; const?: any; enum?: any; oneOf?: any; anyOf?: any; allOf?: any; }) {
    let types = schema.type();

    if (types !== undefined) {
      if (Array.isArray(types)) {
        // if types have `integer` and `number` types, `integer` is unnecessary
        if (types.includes('integer') && types.includes('number')) {
          types = types.filter(t => t !== 'integer');
        }
        return types.length === 1 ? types[0] : types;
      }
      return types;
    }

    const constValue = schema.const();
    if (constValue !== undefined) {
      const typeOf = typeof constValue;
      if (typeOf === 'number' && Number.isInteger(constValue)) {
        return 'integer';
      }
      return typeOf;
    }
    const enumValue = schema.enum();
    if (Array.isArray(enumValue) && enumValue.length) {
      const inferredType = Array.from(new Set(enumValue.map(e => {
        const typeOf = typeof e;
        if (typeOf === 'number' && Number.isInteger(e)) {
          return 'integer';
        }
        return typeOf;
      })));
      return inferredType.length === 1 ? inferredType[0] : inferredType;
    }

    const schemaKeys = Object.keys(schema.json() || {}) || [];
    const hasInferredTypes = Object.keys(jsonSchemaKeywordTypes).some(key =>
      schemaKeys.includes(key),
    );
    if (hasInferredTypes === true) {
      return '';
    }
    if (this.toCombinedType(schema)) {
      return '';
    }
    return ANY;
  }

  static prettifyValue(value: { toString: () => any; }) {
    const typeOf = typeof value;
    if (typeOf === 'string') {
      return `"${value}"`;
    }
    if (typeOf === 'number' || typeOf === 'bigint' || typeOf === 'boolean') {
      return value;
    }
    if (Array.isArray(value)) {
      return `[${value.toString()}]`;
    }
    return JSON.stringify(value);
  }

  static humanizeConstraints(schema: { minimum: () => undefined; exclusiveMinimum: () => undefined; maximum: () => undefined; exclusiveMaximum: () => undefined; multipleOf: () => { toString: (arg0: number) => any; } | undefined; minLength: () => number | undefined; maxLength: () => undefined; uniqueItems: () => any; minItems: () => number | undefined; maxItems: () => undefined; minProperties: () => number | undefined; maxProperties: () => undefined; }) {
    const constraints = [];

    // related to number/integer
    const numberRange = this.humanizeNumberRangeConstraint(
      schema.minimum(),
      schema.exclusiveMinimum(),
      schema.maximum(),
      schema.exclusiveMaximum(),
    );
    if (numberRange !== undefined) {
      constraints.push(numberRange);
    }
    const multipleOfConstraint = this.humanizeMultipleOfConstraint(
      schema.multipleOf(),
    );
    if (multipleOfConstraint !== undefined) {
      constraints.push(multipleOfConstraint);
    }

    // related to string
    const stringRange = this.humanizeRangeConstraint(
      'characters',
      schema.minLength(),
      schema.maxLength(),
    );
    if (stringRange !== undefined) {
      constraints.push(stringRange);
    }

    // related to array
    const hasUniqueItems = schema.uniqueItems();
    const arrayRange = this.humanizeRangeConstraint(
      hasUniqueItems ? 'unique items' : 'items',
      schema.minItems(),
      schema.maxItems(),
    );
    if (arrayRange !== undefined) {
      constraints.push(arrayRange);
    }

    // related to object
    const objectRange = this.humanizeRangeConstraint(
      'properties',
      schema.minProperties(),
      schema.maxProperties(),
    );
    if (objectRange !== undefined) {
      constraints.push(objectRange);
    }

    return constraints;
  }

  static humanizeNumberRangeConstraint(
    min: undefined,
    exclusiveMin: undefined,
    max: undefined,
    exclusiveMax: undefined,
  ) {
    const hasExclusiveMin = exclusiveMin !== undefined;
    const hasMin = min !== undefined || hasExclusiveMin;
    const hasExclusiveMax = exclusiveMax !== undefined;
    const hasMax = max !== undefined || hasExclusiveMax;

    let numberRange;
    if (hasMin && hasMax) {
      numberRange = hasExclusiveMin ? '( ' : '[ ';
      numberRange += hasExclusiveMin ? exclusiveMin : min;
      numberRange += ' .. ';
      numberRange += hasExclusiveMax ? exclusiveMax : max;
      numberRange += hasExclusiveMax ? ' )' : ' ]';
    } else if (hasMin) {
      numberRange = hasExclusiveMin ? '> ' : '>= ';
      numberRange += hasExclusiveMin ? exclusiveMin : min;
    } else if (hasMax) {
      numberRange = hasExclusiveMax ? '< ' : '<= ';
      numberRange += hasExclusiveMax ? exclusiveMax : max;
    }
    return numberRange;
  }

  static humanizeMultipleOfConstraint(
    multipleOf: { toString: (arg0: number) => any; } | undefined,
  ) {
    if (multipleOf === undefined) {
      return;
    }
    const strigifiedMultipleOf = multipleOf.toString(10);
    if (!(/^0\.0*1$/).test(strigifiedMultipleOf)) {
      return `multiple of ${strigifiedMultipleOf}`;
    }
    return `decimal places <= ${strigifiedMultipleOf.split('.')[1].length}`;
  }

  static humanizeRangeConstraint(
    description: any,
    min: number | undefined,
    max: undefined,
  ) {
    let stringRange;
    if (min !== undefined && max !== undefined) {
      if (min === max) {
        stringRange = `${min} ${description}`;
      } else {
        stringRange = `[ ${min} .. ${max} ] ${description}`;
      }
    } else if (max !== undefined) {
      stringRange = `<= ${max} ${description}`;
    } else if (min !== undefined) {
      if (min === 1) {
        stringRange = 'non-empty';
      } else {
        stringRange = `>= ${min} ${description}`;
      }
    }
    return stringRange;
  }

  static getDependentRequired(propertyName: string, schema: { dependencies: () => any; }) {
    const dependentRequired = [];
    const dependencies = schema.dependencies();
    if (!dependencies) {
      return;
    }

    for (const [prop, array] of Object.entries(dependencies)) {
      if (Array.isArray(array) && array.includes(propertyName)) {
        dependentRequired.push(prop);
      }
    }
    return dependentRequired.length ? dependentRequired : undefined;
  }

  static getDependentSchemas(schema: { dependencies: () => any; }) {
    const dependencies = schema.dependencies();
    if (!dependencies) {
      return;
    }

    const records:any = {};
    for (const [prop, propSchema] of Object.entries(dependencies)) {
      if (typeof propSchema === 'object' && !Array.isArray(propSchema)) {
        records[String(prop)] = propSchema;
      }
    }
    if (!Object.keys(records).length) {
      return undefined;
    }

    const json:object = {
      type: 'object',
      properties: Object.entries(records).reduce(
        (obj:any, [propertyName, propertySchema]:any[]) => {
          obj[String(propertyName)] = Object.assign({}, propertySchema.json());
          return obj;
        },
        {},
      ),
      [extRenderType]: false,
      [extRenderAdditionalInfo]: false,
    };
    return new SchemaModel(json);
  }
  
  static parametersToSchema(parameters: any[]) {
    if (parameters.length === 0) {
      return;
    }

    const json:object = {
      type: 'object',
      properties: parameters.reduce(
        (obj, parameter) => {
          const parameterName = parameter.id();
          obj[String(parameterName)] = Object.assign({}, parameter.schema() === undefined ? {type: 'string'} : parameter.schema().json());
          obj[String(parameterName)].description =
            parameter.description() || obj[String(parameterName)].description;
          obj[String(parameterName)][extParameterLocation] = parameter.location();
          return obj;
        },
        {},
      ),
      required: parameters.map(parameter => parameter.id()),
      [extRenderType]: false,
      [extRenderAdditionalInfo]: false,
    };
    return new SchemaModel(json);
  }
  static jsonFieldToSchema(value: any): object {
    if (value === undefined || value === null) {
      return {
        type: 'string',
        const: value === undefined ? '' : 'NULL',
        [extRawValue]: true,
        [extRenderType]: false,
      };
    }
    if (typeof value !== 'object') {
      const str =
        typeof value.toString === 'function' ? value.toString() : value;
      return {
        type: 'string',
        const: str,
        [extRawValue]: true,
        [extRenderType]: false,
      };
    }
    if (this.isJSONSchema(value)) {
      return value;
    }
    if (Array.isArray(value)) {
      return {
        type: 'array',
        items: value.map(v => this.jsonFieldToSchema(v)),
        [extRenderType]: false,
        [extRenderAdditionalInfo]: false,
      };
    }
    return {
      type: 'object',
      properties: Object.entries(value).reduce((obj:any, [k, v]) => {
        obj[String(k)] = this.jsonFieldToSchema(v);
        return obj;
      }, {}),
      [extRenderType]: false,
      [extRenderAdditionalInfo]: false,
    };
  }

  static jsonToSchema(value: any): SchemaModel {
    if (value && typeof value.json === 'function') {
      value = value.json();
    }
    const json = this.jsonFieldToSchema(value) as object;
    return new SchemaModel(json);
  }

  private static isJSONSchema(value: any): boolean {
    if (
      value &&
      typeof value === 'object' &&
      (jsonSchemaTypes.includes(value.type) ||
        (Array.isArray(value.type) &&
          value.type.some((t: string) => !jsonSchemaTypes.includes(t))))
    ) {
      return true;
    }
    return false;
  }

  static getCustomExtensions(item: any): Record<string, any> {
    try {
      const extensions = item.extensions().all();
      return extensions.reduce((acc: { [x: string]: any; }, ext: { id: () => any; value: () => any; }) => {
        const extName = ext.id();
        if (
          !extName.startsWith('x-parser-') &&
          !extName.startsWith('x-schema-private-')
        ) {
          acc[String(extName)] = ext.value();
        }
        return acc;
      }, {});
    } catch (err) {
      return {};
    }
  }
}

class ServerHelper {
  static securityType(value: string) {
    switch (value) {
    case 'apiKey':
      return 'API key';
    case 'oauth2':
      return 'OAuth2';
    case 'openIdConnect':
      return 'Open ID';
    case 'http':
      return 'HTTP';
    case 'userPassword':
      return 'User/Password';
    case 'X509':
      return 'X509';
    case 'symmetricEncryption':
      return 'Symmetric Encription';
    case 'asymmetricEncryption':
      return 'Asymmetric Encription';
    case 'httpApiKey':
      return 'HTTP API key';
    case 'scramSha256':
      return 'ScramSha256';
    case 'scramSha512':
      return 'ScramSha512';
    case 'gssapi':
      return 'GSSAPI';
    case 'plain':
      return 'PLAIN';
    default:
      return 'API key';
    }
  }

  static flowName(value: string) {
    switch (value) {
    case 'implicit':
      return 'Implicit';
    case 'password':
      return 'Password';
    case 'clientCredentials':
      return 'Client credentials';
    case 'authorizationCode':
      return 'Authorization Code';
    default:
      return 'Implicit';
    }
  }

  static getKafkaSecurity(protocol: string, securitySchema: { type: () => any; }) {
    let securityProtocol;
    let saslMechanism;
    if (protocol === 'kafka') {
      if (securitySchema) {
        securityProtocol = 'SASL_PLAINTEXT';
      } else {
        securityProtocol = 'PLAINTEXT';
      }
    } else if (securitySchema) {
      securityProtocol = 'SASL_SSL';
    } else {
      securityProtocol = 'SSL';
    }
    if (securitySchema) {
      switch (securitySchema.type()) {
      case 'plain':
        saslMechanism = 'PLAIN';
        break;
      case 'scramSha256':
        saslMechanism = 'SCRAM-SHA-256';
        break;
      case 'scramSha512':
        saslMechanism = 'SCRAM-SHA-512';
        break;
      case 'oauth2':
        saslMechanism = 'OAUTHBEARER';
        break;
      case 'gssapi':
        saslMechanism = 'GSSAPI';
        break;
      case 'X509':
        securityProtocol = 'SSL';
        break;
      }
    }

    return { securityProtocol, saslMechanism };
  }
}

class MessageHelper {
  static getPayloadExamples(message: { examples: () => { (): any; new(): any; all: { (): any; new(): any; }; }; payload: () => any; }) {
    const examples = message.examples().all();
    if (Array.isArray(examples) && examples.some(e => e.payload())) {
      const messageExamples = examples
        .map(e => {
          if (!e.payload()) {return;}
          return {
            name: e.name(),
            summary: e.summary(),
            example: e.payload(),
          };
        })
        .filter(Boolean);
  
      if (messageExamples.length > 0) {
        return messageExamples;
      }
    }
  
    const payload = message.payload();
    if (payload?.examples()) {
      return payload.examples().map((example: any) => ({ example }));
    }
  }
  
  static getHeadersExamples(message: { examples: () => { (): any; new(): any; all: { (): any; new(): any; }; }; headers: () => any; }) {
    const examples = message.examples().all();
    if (Array.isArray(examples) && examples.some(e => e.headers())) {
      const messageExamples = examples
        .map(e => {
          if (!e.headers()) {return;}
          return {
            name: e.name(),
            summary: e.summary(),
            example: e.headers(),
          };
        })
        .filter(Boolean);
  
      if (messageExamples.length > 0) {
        return messageExamples;
      }
    }
  
    const headers = message.headers();
    if (headers?.examples()) {
      return headers.examples().map((example: any) => ({ example }));
    }
  }

  static generateExample(value: any, options: any) {
    return JSON.stringify(sample(value, options || {}) || '', null, 2);
  }
}

export default async function info(asyncapi:AsyncAPIDocumentInterface, context: vscode.ExtensionContext) {
    
    
    const info = asyncapi.info();
    const templatePath = path.join(context.extensionPath,'dist', 'components','Asyncapi.ejs');

    return await ejs.renderFile(templatePath, {
        info: {
            title: info.title(),
            version: info.version(),
            defaultContentType: asyncapi.defaultContentType(),
            specId: info.id(),
            termsOfService: info.termsOfService(),
            license: info.license(),
            contact: info.contact(),
            externalDocs: info.externalDocs(),
            extensions: info.extensions(),
            hasDescription: info.hasDescription(),
            description: md.render(info.description() || ""),
            tags: info.tags(),
            
        },
        servers:{
            servers: asyncapi.servers(),
            schemaHelper: SchemaHelper,
            serverHelper: ServerHelper,
            md
        },
        operations:{
          channels: asyncapi.channels(),
          isV3: asyncapi.version().split('.')[0] === '3',
          schemaHelper: SchemaHelper,
          serverHelper: ServerHelper,
          messageHelper: MessageHelper,
          allServersLength: asyncapi.servers().all().length,
          md
        },
        path:{
            infoPath: path.join(context.extensionPath,'dist', 'components','Info.ejs'),
            tagsPath: path.join(context.extensionPath,'dist', 'components','Tags.ejs'),
            serversPath: path.join(context.extensionPath,'dist', 'components','Servers.ejs'),
            securityPath: path.join(context.extensionPath,'dist', 'components','Security.ejs'),
            bindingsPath: path.join(context.extensionPath,'dist', 'components','Bindings.ejs'),
            extensionsPath: path.join(context.extensionPath,'dist', 'components','Extensions.ejs'),
            schemaPath: path.join(context.extensionPath,'dist', 'components','Schema.ejs'),
            operationsPath: path.join(context.extensionPath,'dist', 'components','Operations.ejs'),
            messagePath: path.join(context.extensionPath,'dist', 'components','Message.ejs')
        }
    });
}  