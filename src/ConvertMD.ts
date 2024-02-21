import * as fs from 'fs';
import * as yaml from 'js-yaml';

interface AsyncAPIDocument {
    asyncapi: string;
    info: {
        title: string;
        version: string;
        description: string;
    };
    servers: {
        [key: string]: {
            host: string;
            protocol: string;
            description: string;
        };
    };
    channels: {
        [key: string]: {
            address: string;
            description: string;
            messages: {
                [key: string]: {
                    $ref: string;
                };
            };
            parameters?: {
                [key: string]: {
                    $ref: string;
                };
            };
        };
    };
    operations: {
        [key: string]: {
            action: string;
            channel: {
                $ref: string;
            };
            summary: string;
            traits?: {
                [key: string]: {
                    $ref: string;
                };
            };
            messages?: {
                [key: string]: {
                    $ref: string;
                };
            };
        };
    };
    components?: {
        messages?: {
            [key: string]: {
                name: string;
                title: string;
                summary: string;
                contentType: string;
                traits?: {
                    [key: string]: {
                        $ref: string;
                    };
                };
                payload?: {
                    $ref: string;
                };
            };
        };
        schemas?: {
            [key: string]: {
                type: string;
                properties: {
                    [key: string]: {
                        type: string;
                        minimum?: number;
                        maximum?: number;
                        description?: string;
                        enum?: string[];
                        format?: string;
                        items?: {
                            type: string;
                        };
                        $ref?: string;
                    };
                };
                description?: string;
            };
        };
        securitySchemes?: {
            [key: string]: {
                type: string;
                description: string;
            };
        };
        parameters?: {
            [key: string]: {
                description: string;
                schema: {
                    type: string;
                    format?: string;
                    minimum?: number;
                    maximum?: number;
                };
            };
        };
        messageTraits?: {
            [key: string]: {
                headers: {
                    type: string;
                    properties: {
                        [key: string]: {
                            type: string;
                            minimum?: number;
                            maximum?: number;
                        };
                    };
                };
            };
        };
        operationTraits?: {
            [key: string]: {
                bindings: {
                    kafka: {
                        clientId: {
                            type: string;
                            enum: string[];
                        };
                    };
                };
            };
        };
    };
}
export function convertAsyncAPIToMermaid(asyncAPIFilePath:string): string {
  const yamlFile = fs.readFileSync(asyncAPIFilePath, 'utf8');
  const asyncAPIDocument: AsyncAPIDocument = yaml.load(yamlFile) as AsyncAPIDocument;
  let mermaidCode = `flowchart TD\n`;

  mermaidCode += `    subgraph "${asyncAPIDocument.info.title}"\n`;

  // Add Servers subgraph
  mermaidCode += `        subgraph "Servers"\n`;
  Object.entries(asyncAPIDocument.servers).forEach(([serverName, serverInfo]) => {
      mermaidCode += `            ${serverName}["${serverName}"]\n`;
  });
  mermaidCode += `        end\n`;

  // Add Channels subgraph
  mermaidCode += `        subgraph "Channels"\n`;
  Object.entries(asyncAPIDocument.channels).forEach(([channelName, channelInfo]) => {
      mermaidCode += `            ${channelName}["${channelName}"]\n`;
  });
  mermaidCode += `        end\n`;

  // Add Operations subgraph
  mermaidCode += `        subgraph "Operations"\n`;
  Object.entries(asyncAPIDocument.operations).forEach(([operationName, operationInfo]) => {
      mermaidCode += `            ${operationName}["${operationName}"]\n`;
  });
  mermaidCode += `        end\n`;

  // Add Messages subgraph
  mermaidCode += `        subgraph "Messages"\n`;
  Object.entries(asyncAPIDocument.components.messages).forEach(([messageName, messageInfo]) => {
      mermaidCode += `            ${messageName}["${messageName}"]\n`;
  });
  mermaidCode += `        end\n`;

  mermaidCode += `    end\n`;

  // Add connections between servers and channels
  Object.entries(asyncAPIDocument.servers).forEach(([serverName]) => {
      Object.entries(asyncAPIDocument.channels).forEach(([channelName]) => {
          mermaidCode += `    ${serverName} --> ${channelName}\n`;
      });
  });

  // Add connections between channels and operations
  Object.entries(asyncAPIDocument.channels).forEach(([channelName, channelInfo]) => {
      Object.entries(asyncAPIDocument.operations).forEach(([operationName]) => {
          if (channelInfo.messages && channelInfo.messages[operationName]) {
              mermaidCode += `    ${channelName} --> ${operationName}\n`;
          }
      });
  });

  // Add connections between channels and messages
  Object.entries(asyncAPIDocument.channels).forEach(([channelName, channelInfo]) => {
      Object.entries(asyncAPIDocument.components.messages).forEach(([messageName]) => {
          if (channelInfo.messages && channelInfo.messages[messageName]) {
              mermaidCode += `    ${channelName} --> ${messageName}\n`;
          }
      });
  });

  // Add connections between operations and messages
  Object.entries(asyncAPIDocument.operations).forEach(([operationName, operationInfo]) => {
      Object.entries(asyncAPIDocument.components.messages).forEach(([messageName]) => {
          if (operationInfo.messages && operationInfo.messages[messageName]) {
              mermaidCode += `    ${operationName} --> ${messageName}\n`;
          }
      });
  });
  return mermaidCode;
}
