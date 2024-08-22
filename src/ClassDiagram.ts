import * as vscode from 'vscode';
import * as ejs from 'ejs';
import * as path from 'path';

export default async function classDiagram(asyncapi: any, context: vscode.ExtensionContext) {
  const templatePath = path.join(context.extensionPath, 'dist', 'components', 'ClassDiagram.ejs');
  let data: any = {
    version: asyncapi?.asyncapi,
    channels: [...Object.entries(asyncapi.channels || {}).map((v: any)=> [v[0], v[1].messages || {}]), ...Object.entries(asyncapi.components?.channels || {}).map((v: any)=> [v[0], v[1].messages || {}])],
    operations: [...Object.entries(asyncapi.operations || {}), ...Object.entries(asyncapi.components?.operations || {})],
    messages: [...new Set(Object.entries(asyncapi.components?.messages || {}))],
    payloads: [],
    others: [],
    relations: [],
  };

  function replaceInvalidChars(str: string){
    return str.replace(/[`~!@#$%^&*()|+\-=?;:'",.<>\{\}\[\]\\\/]/gi, '_');
  }

  function getKeysFromEntries(arr: any){
    return arr.map((v: any[]) => v[0]);
  }

  function recursiveObjectSplit(dest: any, source: any, parent: string) {
    Object.entries(source || {}).map(([sourceName, sourceInfo]: [string, any]) => {
      if (sourceName !== '$ref') {
        if (!dest[dest.length - 1][1][sourceName]) {
          Object.defineProperty(dest[dest.length - 1][1], sourceName, { value: sourceInfo });
        }
      }
    });
    Object.entries(source || {}).map(([sourceName, sourceInfo]: [string, any]) => {
      if (sourceName === '$ref') {
        let parsedRef = String(sourceInfo).split('/');
        if (Object.keys(asyncapi.components?.schemas || {}).indexOf(parsedRef[parsedRef.length - 1].replace(/~1/gi, '/')) > -1 ) {
          let element = asyncapi.components?.schemas[parsedRef[parsedRef.length - 1].replace(/~1/gi, '/')];
          if(typeof element === "object" && (String(element?.type).toLowerCase() === 'object' || !element?.type)) {
            recursiveObjectSplit(
              data.others,
              asyncapi.components.schemas[parsedRef[parsedRef.length - 1].replace(/~1/gi, '/')],
              `${parent}.${parsedRef[parsedRef.length - 1].replace(/~1/gi, '/')}`
            );
          }
        }
      } else if (typeof sourceInfo === "object" && (String(sourceInfo?.type).toLowerCase() === 'object' || !sourceInfo?.type) ) {
          
          if(sourceInfo?.$ref){
            let parsedRef = String(sourceInfo?.$ref).split('/');
            if (Object.keys(asyncapi.components?.schemas || {}).indexOf(parsedRef[parsedRef.length - 1].replace(/~1/gi, '/')) > -1 ) {
              let element = asyncapi.components?.schemas[parsedRef[parsedRef.length - 1].replace(/~1/gi, '/')];
              if((String(element?.type).toLowerCase() === 'object' || !element?.type)){
                data.others.push([`${parent}.${sourceName}`, {}]);
                data.relations.push(
                  `${replaceInvalidChars(parent)} <-- ${replaceInvalidChars(parent)}_${replaceInvalidChars(sourceName)}`
                );
                recursiveObjectSplit(data.others, sourceInfo.properties, `${parent}.${sourceName}`);
              }else{
                  Object.defineProperty(dest[dest.length - 1][1][sourceName], 'type', { value: element.type });
              }
            }
          }else{
            data.others.push([`${parent}.${sourceName}`, {}]);
            data.relations.push(
              `${replaceInvalidChars(parent)} <-- ${replaceInvalidChars(parent)}_${replaceInvalidChars(sourceName)}`
            );
            recursiveObjectSplit(data.others, sourceInfo.properties, `${parent}.${sourceName}`);
          }
      }
    });
  }

  data.messages?.map(([messageName, messageInfo]: [string, any]) => {
    if (!messageInfo.payload) {
      return;
    }
    if (messageInfo.payload?.$ref) {
      let parsedRef = String(messageInfo.payload?.$ref).split('/');
      let schemas = Object.entries(asyncapi.components?.schemas || {});
      if (
        schemas
          .map(v => {
            return v[0];
          })
          .indexOf(parsedRef[parsedRef.length - 1].replace(/~1/gi, '/')) > -1
      ) {
        data.payloads.push([`${messageName}`, {}]);
        recursiveObjectSplit(
          data.payloads,
          asyncapi.components?.schemas[parsedRef[parsedRef.length - 1].replace(/~1/gi, '/')].properties,
          `${messageName}`
        );
      }
    } else if (messageInfo.payload.schemaFormat) {
      if (messageInfo.payload.schema?.$ref) {
        let parsedRef = String(messageInfo.payload.schema.$ref).split('/');
        let schemas = Object.entries(asyncapi.components?.schemas || {});
        if (
          schemas
            .map(v => {
              return v[0];
            })
            .indexOf(parsedRef[parsedRef.length - 1].replace(/~1/gi, '/')) > -1
        ) {
          data.payloads.push([
            `${messageName}`,
            {},
          ]);
          recursiveObjectSplit(
            data.payloads,
            asyncapi.components?.schemas[parsedRef[parsedRef.length - 1].replace(/~1/gi, '/')].properties,
            `${messageName}`
          );
        }
      } else {
        data.payloads.push([`${messageName}`, {}]);
        recursiveObjectSplit(data.payloads, messageInfo.payload.schema.properties, `${messageName}`);
      }
    } else {
      data.payloads.push([`${messageName}`, {}]);
      recursiveObjectSplit(data.payloads, messageInfo.payload.properties, `${messageName}`);
    }
  });

  
  Object.entries({ ...asyncapi.channels, ...asyncapi.components?.channels }).map(([channelName, channelInfo]: [string, any]) => {
    if (!asyncapi.asyncapi || asyncapi.asyncapi?.split('.')[0] !== '2') {
      Object.entries(channelInfo.messages || {}).map(([messageName, messageInfo]: [string, any]) => {
        if (!messageInfo?.$ref) {
          if (getKeysFromEntries(data.messages).indexOf(messageName) === -1) {
            data.messages.push([messageName, messageInfo]);
            data.relations.push(
              `CHANNEL_${replaceInvalidChars(channelName)} <-- ${replaceInvalidChars(messageName)}`
            );
          } else {
            data.messages.push([`${channelName}_${messageName}`, messageInfo]);
            data.relations.push(
              `CHANNEL_${replaceInvalidChars(channelName)} <-- ${replaceInvalidChars(channelName)}_${replaceInvalidChars(messageName)}`
            );
          }
        } else {
          let parsedRef = String(messageInfo?.$ref).split('/');
          if (getKeysFromEntries(data.messages).indexOf(parsedRef[parsedRef.length - 1].replace(/~1/gi, '/')) > -1) {
            data.relations.push(
              `CHANNEL_${replaceInvalidChars(channelName)} <-- ${replaceInvalidChars((parsedRef.pop() ?? '').replace(/~1/gi, '/'))}`
            );
          }
        }
      });
    } else if (asyncapi.asyncapi?.split('.')[0] === '2') {
      Object.entries({ subscribe: channelInfo.subscribe, publish: channelInfo.publish }).map(
        ([operationName, operationInfo]: [string, any]) => {
          if (!operationInfo) {
            return;
          }
          data.operations.push([`${channelName}_${operationName}`, operationInfo]);
          data.relations.push(
            `CHANNEL_${replaceInvalidChars(channelName)} <-- OPERATION_${replaceInvalidChars(channelName)}_${replaceInvalidChars(operationName)}`
          );
          if (operationInfo.message?.oneOf) {
            operationInfo.message.oneOf.map((message: any) => {
              Object.entries(message).map(([messageName, messageInfo]: [string, any]) => {
                if (messageName === '$ref') {
                  let parsedMsg = String(messageInfo).split('/');
                  let finalMsgStr =
                    getKeysFromEntries(data.messages).indexOf(`${parsedMsg[parsedMsg.length - 2]}_${parsedMsg[parsedMsg.length - 1]}`) > -1
                      ? `${parsedMsg[parsedMsg.length - 2]}_${parsedMsg[parsedMsg.length - 1]}`
                      : (parsedMsg.pop() ?? '').replace(/~1/gi, '/');
                  if (getKeysFromEntries(data.messages).indexOf(finalMsgStr) > -1) {
                    data.relations.push(
                      `CHANNEL_${replaceInvalidChars(channelName)} <-- ${replaceInvalidChars((finalMsgStr ?? '').replace(/~1/gi, '/'))}`
                    );
                  }
                } else {
                  data.messages.push([`${channelName}_${messageName}`, messageInfo]);
                  data.relations.push(
                    `CHANNEL_${replaceInvalidChars(channelName)} <-- ${replaceInvalidChars(channelName)}_${replaceInvalidChars(messageName)}`
                  );
                }
              });
            });
          } else {
            Object.entries(operationInfo.message).map(([messageName, messageInfo]: [string, any]) => {
              if (messageName === '$ref') {
                let parsedMsg = String(messageInfo).split('/');
                let finalMsgStr =
                  getKeysFromEntries(data.messages).indexOf(`${parsedMsg[parsedMsg.length - 2]}_${parsedMsg[parsedMsg.length - 1]}`) > -1
                    ? `${parsedMsg[parsedMsg.length - 2]}_${parsedMsg[parsedMsg.length - 1]}`
                    : (parsedMsg.pop() ?? '').replace(/~1/gi, '/');
                if (getKeysFromEntries(data.messages).indexOf(finalMsgStr) > -1) {
                  data.relations.push(
                    `CHANNEL_${replaceInvalidChars(channelName)} <-- ${replaceInvalidChars((finalMsgStr ?? '').replace(/~1/gi, '/'))}`
                  );
                }
              } else {
                if (getKeysFromEntries(data.messages).indexOf(messageName) === -1) {
                  data.messages.push([messageName, messageInfo]);
                  data.relations.push(
                    `CHANNEL_${replaceInvalidChars(channelName)} <-- ${replaceInvalidChars(messageName)}`
                  );
                } else {
                  data.messages.push([`${channelName}_${messageName}`, messageInfo]);
                  data.relations.push(
                    `CHANNEL_${replaceInvalidChars(channelName)} <-- ${replaceInvalidChars(channelName)}_${replaceInvalidChars(messageName)}`
                  );
                }
              }
            });
          }
        }
      );
    }
  });

  Object.entries({ ...asyncapi.operations, ...asyncapi.components?.operations }).map(
    ([operationName, operationInfo]: [string, any]) => {
      if (asyncapi.asyncapi?.split('.')[0] !== '2') {
        operationInfo.messages?.map((message: any) => {
          Object.entries(message || {}).map(([messageName, messageInfo]: [string, any]) => {
            let parsedMsg = String(messageInfo).split('/');
            let finalMsgStr =
              data.messages.map((v: any[]) => v[0]).indexOf(`${parsedMsg[parsedMsg.length - 2]}_${parsedMsg[parsedMsg.length - 1]}`) > -1
                ? `${parsedMsg[parsedMsg.length - 2]}_${parsedMsg[parsedMsg.length - 1]}`
                : (parsedMsg.pop() || '').replace(/~1/gi, '/');
            if (data.messages.map((v: any[]) => v[0]).indexOf(finalMsgStr) > -1) {
              data.relations.push(
                `OPERATION_${replaceInvalidChars(operationName)} <-- ${replaceInvalidChars((finalMsgStr || '').replace(/~1/gi, '/'))}`
              );
            }
          });
        });

        Object.entries(operationInfo.channel || {}).map(([channelName, channelInfo]: [string, any]) => {
          let parsedRef = String(channelInfo).split('/');
          if (data.channels.map((v: any[]) => v[0]).indexOf(parsedRef[parsedRef.length - 1].replace(/~1/gi, '/')) > -1) {
            data.relations.push(
              `CHANNEL_${replaceInvalidChars((parsedRef.pop() ?? '').replace(/~1/gi, '/'))} <-- OPERATION_${replaceInvalidChars(operationName)}`
            );
          }
        });
      }
    }
  );
  return await ejs.renderFile(templatePath, {
    ...data,
  });
}

