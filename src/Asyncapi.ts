import { AsyncAPIDocumentInterface, SchemaV2 as SchemaModel } from '@asyncapi/parser';
import * as vscode from 'vscode';
import * as ejs from 'ejs';
import * as path from 'path';
import * as Markdownit from 'markdown-it';
import { sample } from 'openapi-sampler';

const md = Markdownit('commonmark');

const extRenderType = 'x-schema-private-render-type';
const extRenderAdditionalInfo = 'x-schema-private-render-additional-info';
const extRawValue = 'x-schema-private-raw-value';
const extParameterLocation = 'x-schema-private-parameter-location';
const jsonSchemaTypes: string[] = ['string', 'number', 'integer', 'boolean', 'array', 'object', 'null'];

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
  static toSchemaType(schema: { json: () => boolean; isBooleanSchema: () => any; not: () => any }): any {
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

  static toType(
    type: string,
    schema: { json?: () => boolean; isBooleanSchema?: () => any; not?: () => any; items?: any; additionalItems?: any }
  ) {
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

  static toCombinedType(schema: {
    json?: () => boolean;
    isBooleanSchema?: () => any;
    not?: () => any;
    oneOf?: any;
    anyOf?: any;
    allOf?: any;
  }) {
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

  static inferType(schema: {
    json: any;
    isBooleanSchema?: (() => any);
    not?: (() => any) ;
    type?: any;
    const?: any;
    enum?: any;
    oneOf?: any;
    anyOf?: any;
    allOf?: any;
  }) {
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
      const inferredType = Array.from(
        new Set(
          enumValue.map(e => {
            const typeOf = typeof e;
            if (typeOf === 'number' && Number.isInteger(e)) {
              return 'integer';
            }
            return typeOf;
          })
        )
      );
      return inferredType.length === 1 ? inferredType[0] : inferredType;
    }

    const schemaKeys = Object.keys(schema.json() || {}) || [];
    const hasInferredTypes = Object.keys(jsonSchemaKeywordTypes).some(key => schemaKeys.includes(key));
    if (hasInferredTypes === true) {
      return '';
    }
    if (this.toCombinedType(schema)) {
      return '';
    }
    return ANY;
  }

  static prettifyValue(value: { toString: () => any }) {
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

  static humanizeConstraints(schema: {
    minimum: () => undefined;
    exclusiveMinimum: () => undefined;
    maximum: () => undefined;
    exclusiveMaximum: () => undefined;
    multipleOf: () => { toString: (arg0: number) => any } | undefined;
    minLength: () => number | undefined;
    maxLength: () => undefined;
    uniqueItems: () => any;
    minItems: () => number | undefined;
    maxItems: () => undefined;
    minProperties: () => number | undefined;
    maxProperties: () => undefined;
  }) {
    const constraints = [];

    // related to number/integer
    const numberRange = this.humanizeNumberRangeConstraint(
      schema.minimum(),
      schema.exclusiveMinimum(),
      schema.maximum(),
      schema.exclusiveMaximum()
    );
    if (numberRange !== undefined) {
      constraints.push(numberRange);
    }
    const multipleOfConstraint = this.humanizeMultipleOfConstraint(schema.multipleOf());
    if (multipleOfConstraint !== undefined) {
      constraints.push(multipleOfConstraint);
    }

    // related to string
    const stringRange = this.humanizeRangeConstraint('characters', schema.minLength(), schema.maxLength());
    if (stringRange !== undefined) {
      constraints.push(stringRange);
    }

    // related to array
    const hasUniqueItems = schema.uniqueItems();
    const arrayRange = this.humanizeRangeConstraint(hasUniqueItems ? 'unique items' : 'items', schema.minItems(), schema.maxItems());
    if (arrayRange !== undefined) {
      constraints.push(arrayRange);
    }

    // related to object
    const objectRange = this.humanizeRangeConstraint('properties', schema.minProperties(), schema.maxProperties());
    if (objectRange !== undefined) {
      constraints.push(objectRange);
    }

    return constraints;
  }

  static humanizeNumberRangeConstraint(min: any, exclusiveMin: any, max: any, exclusiveMax: any) {
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

  static humanizeMultipleOfConstraint(multipleOf: { toString: (arg0: number) => any } | undefined) {
    if (multipleOf === undefined) {
      return;
    }
    const strigifiedMultipleOf = multipleOf.toString(10);
    if (!/^0\.0*1$/.test(strigifiedMultipleOf)) {
      return `multiple of ${strigifiedMultipleOf}`;
    }
    return `decimal places <= ${strigifiedMultipleOf?.split('.')[1].length}`;
  }

  static humanizeRangeConstraint(description: any, min: number | undefined, max: undefined) {
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

  static getDependentRequired(propertyName: string, schema: { dependencies: () => any }) {
    const dependentRequired = [];
    const dependencies = schema.dependencies();
    if (!dependencies) {
      return;
    }

    for (const [prop, array] of Object.entries(dependencies || {})) {
      if (Array.isArray(array) && array.includes(propertyName)) {
        dependentRequired.push(prop);
      }
    }
    return dependentRequired.length ? dependentRequired : undefined;
  }

  static getDependentSchemas(schema: { dependencies: () => any }) {
    const dependencies = schema.dependencies();
    if (!dependencies) {
      return;
    }

    const records: any = {};
    for (const [prop, propSchema] of Object.entries(dependencies || {})) {
      if (typeof propSchema === 'object' && !Array.isArray(propSchema)) {
        records[String(prop)] = propSchema;
      }
    }
    if (!Object.keys(records).length) {
      return undefined;
    }

    const json: object = {
      type: 'object',
      properties: Object.entries(records || {}).reduce((obj: any, [propertyName, propertySchema]: any[]) => {
        obj[String(propertyName)] = Object.assign({}, propertySchema.json());
        return obj;
      }, {}),
      [extRenderType]: false,
      [extRenderAdditionalInfo]: false,
    };
    return new SchemaModel(json);
  }

  static parametersToSchema(parameters: any[]) {
    if (parameters.length === 0) {
      return;
    }

    const json: object = {
      type: 'object',
      properties: parameters.reduce((obj, parameter) => {
        const parameterName = parameter.id();
        obj[String(parameterName)] = Object.assign({}, parameter.schema() === undefined ? { type: 'string' } : parameter.schema().json());
        obj[String(parameterName)].description = parameter.description() || obj[String(parameterName)].description;
        obj[String(parameterName)][extParameterLocation] = parameter.location();
        return obj;
      }, {}),
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
      const str = typeof value.toString === 'function' ? value.toString() : value;
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
      properties: Object.entries(value || {}).reduce((obj: any, [k, v]) => {
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
      (jsonSchemaTypes.includes(value.type) || (Array.isArray(value.type) && value.type.some((t: string) => !jsonSchemaTypes.includes(t))))
    ) {
      return true;
    }
    return false;
  }

  static getCustomExtensions(item: any): Record<string, any> {
    try {
      const extensions = item.extensions().all();
      return extensions.reduce((acc: { [x: string]: any }, ext: { id: () => any; value: () => any }) => {
        const extName = ext.id();
        if (!extName.startsWith('x-parser-') && !extName.startsWith('x-schema-private-')) {
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

  static getKafkaSecurity(protocol: string, securitySchema: { type: () => any }) {
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
  static getPayloadExamples(message: { examples: () => { (): any; new (): any; all: { (): any; new (): any } }; payload: () => any }) {
    const examples = message.examples().all();
    if (Array.isArray(examples) && examples.some(e => e.payload())) {
      const messageExamples = examples
        .map(e => {
          if (!e.payload()) {
            return;
          }
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

  static getHeadersExamples(message: { examples: () => { (): any; new (): any; all: { (): any; new (): any } }; headers: () => any }) {
    const examples = message.examples().all();
    if (Array.isArray(examples) && examples.some(e => e.headers())) {
      const messageExamples = examples
        .map(e => {
          if (!e.headers()) {
            return;
          }
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

function addServers(asyncapi: any) {
  return {
    isEmpty: () => (asyncapi.servers ? false : true),
    all: () => {
      return Object.entries(asyncapi.servers || {}).map((server: any) => {
        let finalServerObject:any = null;
        if (server[1]?.$ref) {
            const parsedStr = server[1].$ref.split('/').map((pathComponent: any)=> pathComponent?.replaceAll("~1","/"));
            finalServerObject = (asyncapi.components?.servers)? [server[0],asyncapi.components.servers[parsedStr[3]]] : server;
        } else {
          finalServerObject = server;
        }
        return {
          id: () => finalServerObject[0],
          url: () => (finalServerObject[1] && finalServerObject[1].host ? finalServerObject[1].host : finalServerObject[1]?.url),
          protocol: () => (finalServerObject[1] && finalServerObject[1].protocol ? finalServerObject[1].protocol : ''),
          protocolVersion: () => (finalServerObject[1] && finalServerObject[1].protocolVersion ? finalServerObject[1].protocolVersion : ''),
          hasDescription: () => (finalServerObject[1] && finalServerObject[1].description ? true : false),
          description: () => (finalServerObject[1] ? finalServerObject[1].description : ''),
          summary: () => (finalServerObject[1] ? finalServerObject[1].summary : ''),
          variables: () =>
            finalServerObject[1] && finalServerObject[1].variables
              ? {
                  all: () =>
                    Object.entries(finalServerObject[1].variables || {}).map((entry: any) => {
                      let finalVariablesObject = null;
                      if (entry[1]?.$ref) {
                          const parsedStr = entry[1].$ref.split('/').map((pathComponent: any)=> pathComponent?.replaceAll("~1","/"));
                          finalVariablesObject = (asyncapi.components?.serverVariables)? [entry[0], asyncapi.components.serverVariables[parsedStr[3]]] : entry;
                      } else {
                        finalVariablesObject = entry;
                      }
                      return {
                        id: () => (entry[0] ? entry[0] : ''),
                        description: () => (entry[1] && entry[1].description ? entry[1].description : ''),
                        hasDefaultValue: () => (entry[1] && entry[1].default ? true : false),
                        defaultValue: () => (entry[1] && entry[1].default ? entry[1].default : ''),
                        hasAllowedValues: () => (entry[1] && entry[1].enum ? true : false),
                        allowedValues: () => (entry[1] && entry[1].enum ? entry[1].enum : []),
                      };
                    }),
                }
              : '',
          security: () => {
            return finalServerObject[1].security?.map((sec: any) => {
              return {
                all: () =>
                  Object.entries(sec || {}).map((security: any) => {
                    return {
                      scheme: () => {
                        return {
                          type: () =>
                            asyncapi.components &&
                            asyncapi.components.securitySchemes &&
                            asyncapi.components.securitySchemes[security[1].split('/').pop()]
                              ? asyncapi.components.securitySchemes[security[1].split('/').pop()].type
                              : '',
                          hasDescription: () =>
                            asyncapi.components &&
                            asyncapi.components.securitySchemes &&
                            asyncapi.components.securitySchemes[security[1].split('/').pop()] &&
                            asyncapi.components.securitySchemes[security[1].split('/').pop()].description
                              ? true
                              : false,
                          description: () => asyncapi.components.securitySchemes[security[1].split('/').pop()].description,
                          name: () => asyncapi.components.securitySchemes[security[1].split('/').pop()].name,
                          in: () => asyncapi.components.securitySchemes[security[1].split('/').pop()].in,
                          bearerFormat: () => asyncapi.components.securitySchemes[security[1].split('/').pop()].bearerFormat,
                          openIdConnectUrl: () => asyncapi.components.securitySchemes[security[1].split('/').pop()].openIdConnectUrl,
                          scheme: () => asyncapi.components.securitySchemes[security[1].split('/').pop()].scheme,
                          flows: () => {
                            if (!asyncapi.components.securitySchemes[security[1].split('/').pop()].flows) {
                              return;
                            }
                            return {
                              authorizationCode: () => {
                                return {
                                  authorizationUrl: () =>
                                    asyncapi.components.securitySchemes[security[1].split('/').pop()].flows?.authorizationCode
                                      .authorizationUrl,
                                  refreshUrl: () =>
                                    asyncapi.components.securitySchemes[security[1].split('/').pop()].flows?.authorizationCode?.refreshUrl,
                                  tokenUrl: () =>
                                    asyncapi.components.securitySchemes[security[1].split('/').pop()].flows?.authorizationCode?.tokenUrl,
                                  scopes: () =>
                                    asyncapi.components.securitySchemes[security[1].split('/').pop()].flows?.authorizationCode
                                      ?.availableScopes || [],
                                };
                              },
                              clientCredentials: () => {
                                return {
                                  authorizationUrl: () =>
                                    asyncapi.components.securitySchemes[security[1].split('/').pop()]?.flows?.clientCredentials
                                      ?.authorizationUrl,
                                  refreshUrl: () =>
                                    asyncapi.components.securitySchemes[security[1].split('/').pop()]?.flows?.clientCredentials?.refreshUrl,
                                  tokenUrl: () =>
                                    asyncapi.components.securitySchemes[security[1].split('/').pop()]?.flows?.clientCredentials?.tokenUrl,
                                  scopes: () =>
                                    asyncapi.components.securitySchemes[security[1].split('/').pop()]?.flows?.clientCredentials
                                      ?.availableScopes || [],
                                };
                              },
                              implicit: () => {
                                return {
                                  authorizationUrl: () =>
                                    asyncapi.components.securitySchemes[security[1].split('/').pop()]?.flows?.implicit?.authorizationUrl,
                                  refreshUrl: () =>
                                    asyncapi.components.securitySchemes[security[1].split('/').pop()]?.flows?.implicit?.refreshUrl,
                                  tokenUrl: () =>
                                    asyncapi.components.securitySchemes[security[1].split('/').pop()]?.flows?.implicit?.tokenUrl,
                                  scopes: () =>
                                    asyncapi.components.securitySchemes[security[1].split('/').pop()]?.flows?.implicit?.availableScopes ||
                                    [],
                                };
                              },
                              password: () => {
                                return {
                                  authorizationUrl: () =>
                                    asyncapi.components.securitySchemes[security[1].split('/').pop()]?.flows?.password?.authorizationUrl,
                                  refreshUrl: () =>
                                    asyncapi.components.securitySchemes[security[1].split('/').pop()]?.flows?.password?.refreshUrl,
                                  tokenUrl: () =>
                                    asyncapi.components.securitySchemes[security[1].split('/').pop()]?.flows?.password?.tokenUrl,
                                  scopes: () =>
                                    asyncapi.components.securitySchemes[security[1].split('/').pop()]?.flows?.password?.availableScopes ||
                                    [],
                                };
                              },
                            };
                          },
                        };
                      },
                      scopes: () =>
                        asyncapi.components &&
                        asyncapi.components.securitySchemes &&
                        asyncapi.components.securitySchemes[security[1].split('/').pop()]
                          ? asyncapi.components.securitySchemes[security[1].split('/').pop()].scopes || []
                          : '',
                    };
                  }),
              };
            });
          },
          extensions: () => {
            return {
              all: () =>
                Object.entries(finalServerObject[1].extensions || {}).map((extension: any) => {
                  return {
                    id: () => extension[1]?.id,
                    value: () => extension[1]?.value,
                  };
                }),
            };
          },
          bindings: () => {
            return {
              isEmpty: () => (finalServerObject[1].bindings ? false : true),
              all: () => {
                return Object.entries(finalServerObject[1].bindings || {}).map((binding: any) => {
                  let finalBindingsObject:any = null;
                                    if (binding[1]?.$ref) {
                                        const parsedStr = binding[1].$ref.split('/').map((pathComponent: any)=> pathComponent?.replaceAll("~1","/"));
                                        finalBindingsObject = (asyncapi?.components?.serverBindings)? [binding[0], asyncapi.components.serverBindings[parsedStr[3]]] : binding;
                                    } else {
                                      finalBindingsObject = binding;
                                    }
                  return {
                    protocol: () => (finalBindingsObject[1] && finalBindingsObject[1].protocol ? finalBindingsObject[1].protocol : ''),
                    json: () => (finalBindingsObject[1] && finalBindingsObject[1].json ? finalBindingsObject[1].json : ''),
                    type: () => (finalBindingsObject[1] && finalBindingsObject[1].type ? finalBindingsObject[1].type : ''),
                  };
                });
              },
            };
          },
          tags: () => {
            return {
              isEmpty: () => (finalServerObject[1].tags ? false : true),
              all: () =>
                Object.entries(finalServerObject[1].tags || {}).map((tag: any) => {
                  return {
                    name: () => (tag[1] && tag[1].name ? tag[1].name : ''),
                    description: () => (tag[1] && tag[1].description ? tag[1].description : ''),
                    externalDocs: () => {
                      let finalexternalDocsObject:any = null;
                      if (tag[1]?.externalDocs?.$ref) {
                        const parsedStr = tag[1].externalDocs.$ref.split('/').map((pathComponent: any)=> pathComponent?.replaceAll("~1","/"));
                          finalexternalDocsObject = (asyncapi.components?.externalDocs)? asyncapi.components.externalDocs[parsedStr[3]] : tag[1];
                        
                      } else {
                        finalexternalDocsObject = tag[1];
                      }
                     return { 
                            url: () => finalexternalDocsObject?.externalDocs?.url,
                            description: () => finalexternalDocsObject?.externalDocs?.description,
                            hasDescription: () => (finalexternalDocsObject?.externalDocs?.description ? true : false),
                          };
                    },
                  };
                }),
            };
          },
        };
      });
    },
  };
}

export default async function asyncapiMarkdown(asyncapi: any, context: vscode.ExtensionContext) {
  try{
    if(!asyncapi || !context) {return;}
    const templatePath = path.join(context.extensionPath, 'dist', 'components', 'Asyncapi.ejs');
    if (!asyncapi.isAsyncapiParser) {
      return await ejs.renderFile(templatePath, {
        info: {
          title: asyncapi.info && asyncapi.info.title ? asyncapi.info.title : '',
          version: asyncapi.info && asyncapi.info.version ? asyncapi.info.version : '',
          defaultContentType: asyncapi.defaultContentType ? asyncapi.defaultContentType : '',
          specId: asyncapi.info && asyncapi.info.specId ? asyncapi.info.specId : '',
          termsOfService: asyncapi.info && asyncapi.info.termsOfService ? asyncapi.info.termsOfService : '',
          license:
            asyncapi.info && asyncapi.info.license ? { url: () => asyncapi.info.license.url, name: () => asyncapi.info.license.name } : null,
          contact:
            asyncapi.info && asyncapi.info.contact
              ? { name: () => asyncapi.info.contact.name, url: () => asyncapi.info.contact.url, email:()=> asyncapi.info.contact.email }
              : null,
          externalDocs:
            asyncapi.info && asyncapi.info.externalDocs
              ? { url: () => asyncapi.info.externalDocs.url, description: () => (asyncapi.info.externalDocs.description || asyncapi.info.externalDocs.$ref) }
              : null,
          hasDescription: asyncapi.info && asyncapi.info.description ? true : false,
          description: asyncapi.info ? md.render(asyncapi.info.description || '') : '',
          tags: {
            isEmpty: () => (asyncapi.info.tags ? false : true),
            all: () =>
              Object.entries(asyncapi.info.tags || {}).map((tag: any) => {
                return {
                  name: () => (tag[1] && tag[1].name ? tag[1].name : ''),
                  description: () => (tag[1] && tag[1].description ? tag[1].description : ''),
                  externalDocs: () => {
                    let finalexternalDocsObject:any = null;
                    if (tag[1]?.externalDocs?.$ref) {
                      const parsedStr = tag[1].externalDocs.$ref.split('/').map((pathComponent: any)=> pathComponent?.replaceAll("~1","/"));
                        finalexternalDocsObject = (asyncapi.components?.externalDocs)? asyncapi.components.externalDocs[parsedStr[3]] : tag[1];
                    } else {
                      finalexternalDocsObject = tag[1];
                    }
                   return { 
                          url: () => finalexternalDocsObject?.externalDocs?.url,
                          description: () => finalexternalDocsObject?.externalDocs?.description,
                          hasDescription: () => (finalexternalDocsObject?.externalDocs?.description ? true : false),
                        };
                  }
                };
              }),
          },
        },
        servers: {
          servers: addServers(asyncapi),
          schemaHelper: SchemaHelper,
          serverHelper: ServerHelper,
          md,
        },
        operations: {
          channels: {
            isEmpty: () => (asyncapi.channels ? false : true),
            all: () =>
              Object.entries(asyncapi.channels || {}).map((channel: any) => {
                return {
                  servers: () => addServers(asyncapi),
                  operations: () => {
                    return {
                      all: () =>
                        Object.entries(asyncapi.operations || {
                          [channel[1]?.subscribe?.operationId || "subscribe"]: {
                            ...channel[1]?.subscribe,
                            "channel": {"$ref": channel[1]?.subscribe? `#/channels/${channel[0]}`: null},
                            "action": 'send',
                            "messages": (!channel[1]?.subscribe?.message?.oneOf)? {
                              "subscribeMessage": channel[1]?.subscribe?.message
                            } : channel[1]?.subscribe?.message?.oneOf,
                            "address": channel[0]
                          }, 
                          [channel[1]?.publish?.operationId || "publish"]: {
                            ...channel[1]?.publish,
                            "channel": {"$ref": channel[1]?.publish? `#/channels/${channel[0]}`: null},
                            "action": 'receive',
                            "messages": (!channel[1]?.publish?.message?.oneOf)? {
                              "publishMessage": channel[1]?.publish?.message
                            } : channel[1]?.publish?.message?.oneOf
                          }})
                          .filter(
                            (operation: any) => operation[1].channel?.$ref?.split('channels/').pop().replaceAll('~1', '/') === channel[0]
                          )
                          .map((operation: any) => {
                            return {
                              operationId: () => (operation[0] ? operation[0] : ''),
                              isSend: () => (operation[1] && operation[1].action === 'send' ? true : false),
                              isReceive: () => (operation[1] && operation[1].action === 'receive' ? true : false),
                              reply: () => (operation[1] && operation[1].reply ? operation[1].reply : false),
                              summary: () => (operation[1] && operation[1].summary ? operation[1].summary : ''),
                              hasDescription: () => (operation[1] && operation[1].description ? true : false),
                              description: () => (operation[1] && operation[1].description ? operation[1].description : ''),
                              externalDocs: () =>{
                                let finalexternalDocsObject:any = null;
                                if (operation[1]?.externalDocs?.$ref) {
                                  const parsedStr = operation[1].externalDocs.$ref.split('/').map((pathComponent: any)=> pathComponent?.replaceAll("~1","/"));
                                  finalexternalDocsObject = (asyncapi.components?.externalDocs)? asyncapi.components.externalDocs[parsedStr[3]] : operation[1];
                                } else {
                                  finalexternalDocsObject = operation[1];
                                }
                               return { 
                                      url: () => finalexternalDocsObject?.externalDocs?.url,
                                      description: () => finalexternalDocsObject?.externalDocs?.description,
                                      hasDescription: () => (finalexternalDocsObject?.externalDocs?.description ? true : false),
                                    };
                              },
                              tags: () => {
                                return {
                                  isEmpty: () => (operation[1].tags ? false : true),
                                  all: () =>
                                    Object.entries(operation[1].tags || {}).map((tag: any) => {
                                      return {
                                        name: () => (tag[1] && tag[1].name ? tag[1].name : ''),
                                        description: () => (tag[1] && tag[1].description ? tag[1].description : ''),
                                        externalDocs: () =>{
                                          let finalexternalDocsObject:any = null;
                                          if (tag[1]?.externalDocs?.$ref) {
                                            const parsedStr = tag[1].externalDocs.$ref.split('/').map((pathComponent: any)=> pathComponent?.replaceAll("~1","/"));
                                            finalexternalDocsObject = (asyncapi?.components?.externalDocs)? asyncapi.components.externalDocs[parsedStr[3]] : tag[1];
                                          } else {
                                            finalexternalDocsObject = tag[1];
                                          }
                                         return { 
                                                url: () => finalexternalDocsObject?.externalDocs?.url,
                                                description: () => finalexternalDocsObject?.externalDocs?.description,
                                                hasDescription: () => (finalexternalDocsObject?.externalDocs?.description ? true : false),
                                              };
                                        },
                                      };
                                    }),
                                };
                              },
                              extensions: () => {
                                return {
                                  all: () =>
                                    Object.values(operation[1]?.extensions).map((extension: any) => {
                                      return {
                                        id: () => extension?.id,
                                        value: () => extension?.value,
                                      };
                                    }),
                                };
                              },
                              bindings: () => {
                                return {
                                  isEmpty: () => (operation[1]?.bindings ? false : true),
                                  all: () => {
                                    return Object.entries(operation[1]?.bindings || {}).map((binding: any) => {
                                      let finalBindingsObject:any = null;
                                      if (binding[1]?.$ref) {
                                          const parsedStr = binding[1].$ref.split('/').map((pathComponent: any)=> pathComponent?.replaceAll("~1","/"));
                                          finalBindingsObject = (asyncapi?.components?.operationBindings)? [binding[0], asyncapi.components.operationBindings[parsedStr[3]]] : binding;
                                      } else {
                                        finalBindingsObject = binding;
                                      }
                                      return {
                                        protocol: () => (finalBindingsObject[1] && finalBindingsObject[1].protocol ? finalBindingsObject[1].protocol : ''),
                                        json: () => (finalBindingsObject[1] && finalBindingsObject[1].json ? finalBindingsObject[1].json : ''),
                                        type: () => (finalBindingsObject[1] && finalBindingsObject[1].type ? finalBindingsObject[1].type : ''),
                                      };
                                    });
                                  },
                                };
                              },
                              security: () => {
                                return operation[1]?.security?.map((sec: any) => {
                                  return {
                                    all: () =>
                                      Object.entries(sec || {}).map((security: any) => {
                                        return {
                                          scheme: () => {
                                            return {
                                              type: () =>
                                                asyncapi.components &&
                                                asyncapi.components.securitySchemes &&
                                                asyncapi.components.securitySchemes[security[1].split('/').pop()]
                                                  ? asyncapi.components.securitySchemes[security[1].split('/').pop()].type
                                                  : '',
                                              hasDescription: () =>
                                                asyncapi.components &&
                                                asyncapi.components.securitySchemes &&
                                                asyncapi.components.securitySchemes[security[1].split('/').pop()] &&
                                                asyncapi.components.securitySchemes[security[1].split('/').pop()].description
                                                  ? true
                                                  : false,
                                              description: () =>
                                                asyncapi.components.securitySchemes[security[1].split('/').pop()].description,
                                              name: () => asyncapi.components.securitySchemes[security[1].split('/').pop()].name,
                                              in: () => asyncapi.components.securitySchemes[security[1].split('/').pop()].in,
                                              bearerFormat: () =>
                                                asyncapi.components.securitySchemes[security[1].split('/').pop()].bearerFormat,
                                              openIdConnectUrl: () =>
                                                asyncapi.components.securitySchemes[security[1].split('/').pop()].openIdConnectUrl,
                                              scheme: () => asyncapi.components.securitySchemes[security[1].split('/').pop()].scheme,
                                              flows: () => {
                                                if (!asyncapi.components.securitySchemes[security[1].split('/').pop()].flows) {
                                                  return;
                                                }
                                                return {
                                                  authorizationCode: () => {
                                                    return {
                                                      authorizationUrl: () =>
                                                        asyncapi.components.securitySchemes[security[1].split('/').pop()].flows
                                                          ?.authorizationCode.authorizationUrl,
                                                      refreshUrl: () =>
                                                        asyncapi.components.securitySchemes[security[1].split('/').pop()].flows
                                                          ?.authorizationCode?.refreshUrl,
                                                      tokenUrl: () =>
                                                        asyncapi.components.securitySchemes[security[1].split('/').pop()].flows
                                                          ?.authorizationCode?.tokenUrl,
                                                      scopes: () =>
                                                        asyncapi.components.securitySchemes[security[1].split('/').pop()].flows
                                                          ?.authorizationCode?.availableScopes || [],
                                                    };
                                                  },
                                                  clientCredentials: () => {
                                                    return {
                                                      authorizationUrl: () =>
                                                        asyncapi.components.securitySchemes[security[1].split('/').pop()]?.flows
                                                          ?.clientCredentials?.authorizationUrl,
                                                      refreshUrl: () =>
                                                        asyncapi.components.securitySchemes[security[1].split('/').pop()]?.flows
                                                          ?.clientCredentials?.refreshUrl,
                                                      tokenUrl: () =>
                                                        asyncapi.components.securitySchemes[security[1].split('/').pop()]?.flows
                                                          ?.clientCredentials?.tokenUrl,
                                                      scopes: () =>
                                                        asyncapi.components.securitySchemes[security[1].split('/').pop()]?.flows
                                                          ?.clientCredentials?.availableScopes || [],
                                                    };
                                                  },
                                                  implicit: () => {
                                                    return {
                                                      authorizationUrl: () =>
                                                        asyncapi.components.securitySchemes[security[1].split('/').pop()]?.flows?.implicit
                                                          ?.authorizationUrl,
                                                      refreshUrl: () =>
                                                        asyncapi.components.securitySchemes[security[1].split('/').pop()]?.flows?.implicit
                                                          ?.refreshUrl,
                                                      tokenUrl: () =>
                                                        asyncapi.components.securitySchemes[security[1].split('/').pop()]?.flows?.implicit
                                                          ?.tokenUrl,
                                                      scopes: () =>
                                                        asyncapi.components.securitySchemes[security[1].split('/').pop()]?.flows?.implicit
                                                          ?.availableScopes || [],
                                                    };
                                                  },
                                                  password: () => {
                                                    return {
                                                      authorizationUrl: () =>
                                                        asyncapi.components.securitySchemes[security[1].split('/').pop()]?.flows?.password
                                                          ?.authorizationUrl,
                                                      refreshUrl: () =>
                                                        asyncapi.components.securitySchemes[security[1].split('/').pop()]?.flows?.password
                                                          ?.refreshUrl,
                                                      tokenUrl: () =>
                                                        asyncapi.components.securitySchemes[security[1].split('/').pop()]?.flows?.password
                                                          ?.tokenUrl,
                                                      scopes: () =>
                                                        asyncapi.components.securitySchemes[security[1].split('/').pop()]?.flows?.password
                                                          ?.availableScopes || [],
                                                    };
                                                  },
                                                };
                                              },
                                            };
                                          },
                                          scopes: () =>
                                            asyncapi.components &&
                                            asyncapi.components.securitySchemes &&
                                            asyncapi.components.securitySchemes[security[1].split('/').pop()]
                                              ? asyncapi.components.securitySchemes[security[1].split('/').pop()].scopes || []
                                              : '',
                                        };
                                      }),
                                  };
                                });
                              },
                              messages: () => {
                                return {
                                  all: () => {
                                    let tmp: any = Object.values(operation[1].messages || {});
                                    return tmp.map((value:any)=>{
                                      let finalMessageObject:any = null;
                                        if (value?.$ref) {
                                        const parsedStr = value.$ref.split('/').map((pathComponent: any)=> pathComponent?.replaceAll("~1","/"));
                                        if(parsedStr[1] === "channels"){
                                          const messageInstance = (asyncapi.channels[parsedStr[2]]?.messages)? asyncapi.channels[parsedStr[2]]?.messages[parsedStr[4]] : null;
                                          finalMessageObject = messageInstance?.$ref? asyncapi?.components?.messages[messageInstance?.$ref?.split("/").pop()] : messageInstance;
                                        }else{
                                          finalMessageObject = (asyncapi?.components?.messages)? asyncapi.components.messages[parsedStr[3]] : null;
                                        }
                                      } else {
                                        finalMessageObject = value;
                                      }
                                        return {
                                          id: () => finalMessageObject?.id,
                                          title: () => finalMessageObject?.title,
                                          name: () => finalMessageObject?.name,
                                          hasDescription: () => (finalMessageObject?.description ? true : false),
                                          description: () => finalMessageObject?.description,
                                          contentType: () => finalMessageObject?.contentType,
                                          summary: () => finalMessageObject?.summary,
                                          correlationId: () => {
                                            let finalcorrelationIdObject:any = null;
                                            if (finalMessageObject?.correlationId?.$ref) {
                                              const parsedStr = finalMessageObject.correlationId.$ref.split('/').map((pathComponent: any)=> pathComponent?.replaceAll("~1","/"));
                                              finalcorrelationIdObject = (asyncapi?.components?.correlationIds)? asyncapi.components.correlationIds[parsedStr[3]] : finalMessageObject?.correlationId;
                                            } else {
                                              finalcorrelationIdObject = finalMessageObject?.correlationId;
                                            }
                                            return {
                                              location: () => finalcorrelationIdObject?.location,
                                              hasDescription: () => (finalcorrelationIdObject?.description ? true : false),
                                              description: () => finalcorrelationIdObject?.description,
                                            };
                                          },
                                          externalDocs: () => {
                                            let finalexternalDocsObject:any = null;
                                            if (finalMessageObject?.externalDocs?.$ref) {
                                              const parsedStr = finalMessageObject.externalDocs.$ref.split('/').map((pathComponent: any)=> pathComponent?.replaceAll("~1","/"));
                                              finalexternalDocsObject = (asyncapi?.components?.externalDocs)? asyncapi.components.externalDocs[parsedStr[3]] : finalMessageObject?.externalDocs;
                                            } else {
                                              finalexternalDocsObject = finalMessageObject?.externalDocs;
                                            }
                                           return { 
                                                  url: () => finalexternalDocsObject?.url,
                                                  description: () => finalexternalDocsObject?.description,
                                                  hasDescription: () => (finalexternalDocsObject?.description ? true : false),
                                                };
                                          },
                                          headers: () => {
                                            if(finalMessageObject?.headers?.$ref){
                                              const parsedStr = finalMessageObject.headers.$ref.split('/').map((pathComponent: any)=> pathComponent?.replaceAll("~1","/"));
                                              let finalHeadersObject = (asyncapi?.components?.schemas)? asyncapi.components.schemas[parsedStr[3]] : finalMessageObject?.headers;
                                              return {
                                                incorrect: true,
                                                ...finalHeadersObject,
                                              };
                                            }else if(finalMessageObject?.headers?.schemaFormat){
                                              return {
                                                incorrect: true,
                                                schemaFormat: finalMessageObject.headers.schemaFormat,
                                                ...finalMessageObject?.headers?.schemaFormat?.schema,
                                              };
                                            }else{
                                              return {
                                                incorrect: true,
                                                ...finalMessageObject?.headers,
                                              };
                                            }
                                          },
                                          payload: () => {
                                            if(finalMessageObject?.payload?.$ref){
                                              const parsedStr = finalMessageObject.payload.$ref.split('/').map((pathComponent: any)=> pathComponent?.replaceAll("~1","/"));
                                              let finalPayloadObject = (asyncapi?.components?.schemas)? asyncapi.components.schemas[parsedStr[3]] : finalMessageObject.payload;
                                              return {
                                                incorrect: true,
                                                ...finalPayloadObject,
                                              };
                                            }else if(finalMessageObject?.payload?.schemaFormat){
                                              return {
                                                incorrect: true,
                                                schemaFormat: finalMessageObject.payload.schemaFormat,
                                                ...finalMessageObject?.payload?.schemaFormat?.schema,
                                              };
                                            }else{
                                              return {
                                                incorrect: true,
                                                ...finalMessageObject?.payload,
                                              };
                                            }
                                          },
                                          tags: () => {
                                            return {
                                              isEmpty: () => (finalMessageObject?.tags ? false : true),
                                              all: () =>
                                                Object.entries(finalMessageObject?.tags || {}).map((tag: any) => {
                                                  return {
                                                    name: () => (tag[1] && tag[1].name ? tag[1].name : ''),
                                                    description: () => (tag[1] && tag[1].description ? tag[1].description : ''),
                                                    externalDocs: () =>{
                                                      let finalexternalDocsObject:any = null;
                                                      if (tag[1]?.externalDocs?.$ref) {
                                                        const parsedStr = tag[1].externalDocs.$ref.split('/').map((pathComponent: any)=> pathComponent?.replaceAll("~1","/"));
                                                          finalexternalDocsObject = (asyncapi?.components?.externalDocs)? asyncapi.components.externalDocs[parsedStr[3]] : tag[1];
                                                      } else {
                                                        finalexternalDocsObject = tag[1];
                                                      }
                                                     return { 
                                                            url: () => finalexternalDocsObject?.externalDocs?.url,
                                                            description: () => finalexternalDocsObject?.externalDocs?.description,
                                                            hasDescription: () => (finalexternalDocsObject?.externalDocs?.description ? true : false),
                                                          };
                                                    },
                                                  };
                                                }),
                                            };
                                          },
                                          extensions: () => {
                                            return {
                                              all: () =>
                                                Object.entries(finalMessageObject?.extensions || {}).map((extension: any) => {
                                                  return {
                                                    id: () => extension[1]?.id,
                                                    value: () => extension[1]?.value,
                                                  };
                                                }),
                                            };
                                          },
                                          bindings: () => {
                                            return {
                                              isEmpty: () => (finalMessageObject?.bindings ? false : true),
                                              all: () => {
                                                return Object.entries(finalMessageObject?.bindings || {}).map((binding: any) => {
                                                  let finalBindingsObject:any = null;
                                                  if (binding[1]?.$ref) {
                                                      const parsedStr = binding[1].$ref.split('/').map((pathComponent: any)=> pathComponent?.replaceAll("~1","/"));
                                                      finalBindingsObject = (asyncapi?.components?.messageBindings)? [binding[0], asyncapi.components.messageBindings[parsedStr[3]]] : binding;
                                                  } else {
                                                    finalBindingsObject = binding;
                                                  }
                                                  return {
                                                    protocol: () => (finalBindingsObject[1] && finalBindingsObject[1].protocol ? finalBindingsObject[1].protocol : ''),
                                                    json: () => (finalBindingsObject[1] && finalBindingsObject[1].json ? finalBindingsObject[1].json : ''),
                                                    type: () => (finalBindingsObject[1] && finalBindingsObject[1].type ? finalBindingsObject[1].type : ''),
                                                  };
                                                });
                                              },
                                            };
                                          },
                                          traits: ()=>{
                                            let finalTraitsObject: any = [];
                                            if(Array.isArray(finalMessageObject?.traits)){
                                              finalMessageObject.traits.map((trait: any)=>{
                                                if (trait?.$ref) {
                                                    const parsedStr = trait.$ref.split('/').map((pathComponent: any)=> pathComponent?.replaceAll("~1","/"));
                                                    finalTraitsObject.push((asyncapi?.components?.messageTraits)? asyncapi.components.messageTraits[parsedStr[3]] : trait);
                                                } else {
                                                    finalTraitsObject.push(trait);
                                                }
                                              });
                                            }
                                            return {incorrect: true, ...finalTraitsObject};      
                                          }
                                        };
                                     
                                      });
                                  },
                                };
                              },
                              traits: ()=>{
                                let finalTraitsObject: any = [];
                                if(Array.isArray(operation[1]?.traits)) {
                                  operation[1].traits.map((trait: any)=>{
                                    if (trait?.$ref) {
                                        const parsedStr = trait.$ref.split('/').map((pathComponent: any)=> pathComponent?.replaceAll("~1","/"));
                                        finalTraitsObject.push((asyncapi?.components?.messageTraits)? asyncapi.components.operationTraits[parsedStr[3]] : trait);
                                    } else {
                                        finalTraitsObject.push(trait);
                                    }
                                 });
                               }
                                return {incorrect: true, ...finalTraitsObject};     
                              }
                            };
                          }),
                    };
                  },
                  address: () => (channel[1]?.address ? channel[1].address : channel[0]),
                  hasDescription: () => (channel[1] && channel[1].description ? true : false),
                  description: () => (channel[1] && channel[1].description ? channel[1].description : ''),
                  parameters: () => {
                    return {
                      all: () =>
                        Object.entries(channel[1]?.parameters || {}).map((parameter: any) => {
                          let finalParametersObject:any = null;
                          if (parameter[1]?.$ref) {
                              const parsedStr = parameter[1].$ref.split('/').map((pathComponent: any)=> pathComponent?.replaceAll("~1","/"));
                              finalParametersObject = (asyncapi.components?.parameters)? [parameter[0], asyncapi.components.parameters[parsedStr[3]]] : parameter;
                          } else {
                            finalParametersObject = parameter;
                          }
                          return {
                            id: () => finalParametersObject[0],
                            schema: () => {
                              return {
                                json: () => {
                                  return {
                                    type: finalParametersObject[1]?.schema?.type,
                                    title: finalParametersObject[1]?.schema?.title,
                                    required: finalParametersObject[1]?.schema?.required,
                                  };
                                },
                              };
                            },
                            description: () => finalParametersObject[1]?.description,
                            location: () => finalParametersObject[1]?.location,
                          };
                        }),
                    };
                  },
                  extensions: () => {
                    return {
                      all: () =>
                        Object.entries(channel[1]?.extensions || {}).map((extension: any) => {
                          return {
                            id: () => extension[1]?.id,
                            value: () => extension[1]?.value,
                          };
                        }),
                    };
                  },
                  bindings: () => {
                    return {
                      isEmpty: () => (channel[1]?.bindings ? false : true),
                      all: () => {
                        return Object.entries(channel[1]?.bindings || {}).map((binding: any) => {
                          return {
                            protocol: () => (binding[1] && binding[1].protocol ? binding[1].protocol : ''),
                            json: () => (binding[1] && binding[1].json ? binding[1].json : ''),
                            type: () => (binding[1] && binding[1].type ? binding[1].type : ''),
                          };
                        });
                      },
                    };
                  },
                };
              }),
          },
          isV3: asyncapi.asyncapi ? asyncapi.asyncapi.split('.')[0] === '3' : true,
          schemaHelper: SchemaHelper,
          serverHelper: ServerHelper,
          messageHelper: MessageHelper,
          allServersLength: asyncapi.servers ? Object.keys(asyncapi.servers).length : 0,
          md,
        },
        path: {
          infoPath: path.join(context.extensionPath, 'dist', 'components', 'Info.ejs'),
          tagsPath: path.join(context.extensionPath, 'dist', 'components', 'Tags.ejs'),
          serversPath: path.join(context.extensionPath, 'dist', 'components', 'Servers.ejs'),
          securityPath: path.join(context.extensionPath, 'dist', 'components', 'Security.ejs'),
          bindingsPath: path.join(context.extensionPath, 'dist', 'components', 'Bindings.ejs'),
          extensionsPath: path.join(context.extensionPath, 'dist', 'components', 'Extensions.ejs'),
          schemaPath: path.join(context.extensionPath, 'dist', 'components', 'Schema.ejs'),
          operationsPath: path.join(context.extensionPath, 'dist', 'components', 'Operations.ejs'),
          messagePath: path.join(context.extensionPath, 'dist', 'components', 'Message.ejs'),
        },
      });
    } else {
      const info = asyncapi.info();
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
          description: md.render(info.description() || ''),
          tags: info.tags(),
        },
        servers: {
          servers: asyncapi.servers(),
          schemaHelper: SchemaHelper,
          serverHelper: ServerHelper,
          md,
        },
        operations: {
          channels: asyncapi.channels(),
          isV3: asyncapi.version().split('.')[0] === '3',
          schemaHelper: SchemaHelper,
          serverHelper: ServerHelper,
          messageHelper: MessageHelper,
          allServersLength: asyncapi.servers().all().length,
          md,
        },
        path: {
          infoPath: path.join(context.extensionPath, 'dist', 'components', 'Info.ejs'),
          tagsPath: path.join(context.extensionPath, 'dist', 'components', 'Tags.ejs'),
          serversPath: path.join(context.extensionPath, 'dist', 'components', 'Servers.ejs'),
          securityPath: path.join(context.extensionPath, 'dist', 'components', 'Security.ejs'),
          bindingsPath: path.join(context.extensionPath, 'dist', 'components', 'Bindings.ejs'),
          extensionsPath: path.join(context.extensionPath, 'dist', 'components', 'Extensions.ejs'),
          schemaPath: path.join(context.extensionPath, 'dist', 'components', 'Schema.ejs'),
          operationsPath: path.join(context.extensionPath, 'dist', 'components', 'Operations.ejs'),
          messagePath: path.join(context.extensionPath, 'dist', 'components', 'Message.ejs'),
        },
      });
    }

  }catch(err){
    console.error(err);
  }
}


