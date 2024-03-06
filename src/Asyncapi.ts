import {AsyncAPIDocumentInterface, SchemaV2 as SchemaModel } from '@asyncapi/parser';
import * as vscode from 'vscode';
import * as ejs from 'ejs';
import * as path from 'path';
import * as Markdownit from 'markdown-it';
import { Server } from 'http';

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

class SchemaHelper {
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