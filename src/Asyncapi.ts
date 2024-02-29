import {AsyncAPIDocumentInterface, SchemaV2 as SchemaModel } from '@asyncapi/parser';
import * as vscode from 'vscode';
import * as ejs from 'ejs';
import * as path from 'path';
import * as Markdownit from 'markdown-it';

const md = Markdownit('commonmark');


const extRenderType = 'x-schema-private-render-type';
const extRenderAdditionalInfo = 'x-schema-private-render-additional-info';
const extRawValue = 'x-schema-private-raw-value';
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
            schemaHelper: SchemaHelper
        },
        path:{
            infoPath: path.join(context.extensionPath,'dist', 'components','Info.ejs'),
            tagsPath: path.join(context.extensionPath,'dist', 'components','Tags.ejs'),
            serversPath: path.join(context.extensionPath,'dist', 'components','Servers.ejs'),
            securityPath: path.join(context.extensionPath,'dist', 'components','Security.ejs'),
            bindingsPath: path.join(context.extensionPath,'dist', 'components','Bindings.ejs'),
            extensionsPath: path.join(context.extensionPath,'dist', 'components','Extensions.ejs'),
            schemaPath: path.join(context.extensionPath,'dist', 'components','Schema.ejs')
        }
    });
}  