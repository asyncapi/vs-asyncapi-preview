import * as vscode from 'vscode';
import * as ejs from 'ejs';
import * as path from 'path';

export default async function classDiagram(asyncapi: any, context: vscode.ExtensionContext) {
  const templatePath = path.join(context.extensionPath, 'dist', 'components', 'ClassDiagram.ejs');
  let data: any = {
    title: asyncapi?.info?.title,
    channels: [...Object.entries(asyncapi.channels || {}), ...Object.entries(asyncapi.components?.channels || {})],
    operations: [...Object.entries(asyncapi.operations || {}), ...Object.entries(asyncapi.components?.operations || {})],
    messages: [...new Set(Object.entries(asyncapi.components?.messages || {}))],
    payloads: [],
    headers: [],
    others: [],
    relations: [],
  };

  function recursiveObjectSplit(dest: any, source: any, parent: string, destLength: number) {
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
        if (Object.keys(asyncapi.components?.schemas || {}).indexOf(parsedRef[parsedRef.length - 1].replace(/~1/gi, '/')) > -1) {
          recursiveObjectSplit(
            data.others,
            asyncapi.components.schemas[parsedRef[parsedRef.length - 1].replace(/~1/gi, '/')],
            `${parent}.${parsedRef[parsedRef.length - 1].replace(/~1/gi, '/')}`,
            dest.length
          );
        }
      } else {
        if (typeof sourceInfo === 'object' && !Array.isArray(sourceInfo)) {
          data.others.push([`${parent}.${sourceName}`, {}]);
          data.relations.push(
            `${parent.replace(/[`~!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\\/]/gi, '_')} <-- ${parent.replace(
              /[`~!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\\/]/gi,
              '_'
            )}_${sourceName.replace(/[`~!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\\/]/gi, '_')}`
          );
          recursiveObjectSplit(data.others, sourceInfo, `${parent}.${sourceName}`, dest.length);
        }
      }
    });
  }

  data.messages?.map(([messageName, messageInfo]: [string, any]) => {
    if (!messageInfo.payload) {
      return;
    }
    if (messageInfo.payload.$ref) {
      let parsedRef = String(messageInfo.payload.$ref).split('/');
      let schemas = Object.entries(asyncapi.components?.schemas || {});
      if (
        schemas
          .map(v => {
            return v[0];
          })
          .indexOf(parsedRef[parsedRef.length - 1].replace(/~1/gi, '/')) > -1
      ) {
        data.payloads.push([`${messageName}.payload.${parsedRef[parsedRef.length - 1].replace(/~1/gi, '/')}`, {}]);
        data.relations.push(
          `${messageName.replace(/[`~!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\\/]/gi, '_')} <-- ${messageName.replace(
            /[`~!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\\/]/gi,
            '_'
          )}_payload_${parsedRef[parsedRef.length - 1].replace(/~1/gi, '/').replace(/[`~!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\\/]/gi, '_')}`
        );
        recursiveObjectSplit(
          data.payloads,
          asyncapi.components?.schemas[parsedRef[parsedRef.length - 1].replace(/~1/gi, '/')],
          `${messageName}.payload.${parsedRef[parsedRef.length - 1].replace(/~1/gi, '/')}`,
          data.payloads.length
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
            `${messageName}.payload.${parsedRef[parsedRef.length - 1].replace(/~1/gi, '/')}`,
            { schemaFormat: messageInfo.payload.schemaFormat },
          ]);
          data.relations.push(
            `${messageName.replace(/[`~!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\\/]/gi, '_')} <-- ${messageName.replace(
              /[`~!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\\/]/gi,
              '_'
            )}_payload_${parsedRef[parsedRef.length - 1].replace(/~1/gi, '/').replace(/[`~!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\\/]/gi, '_')}`
          );
          recursiveObjectSplit(
            data.payloads,
            asyncapi.components?.schemas[parsedRef[parsedRef.length - 1].replace(/~1/gi, '/')],
            `${messageName}.payload.${parsedRef[parsedRef.length - 1].replace(/~1/gi, '/')}`,
            data.payloads.length
          );
        }
      } else {
        data.payloads.push([`${messageName}.payload`, { schemaFormat: messageInfo.payload.schemaFormat }]);
        data.relations.push(
          `${messageName.replace(/[`~!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\\/]/gi, '_')} <-- ${messageName.replace(
            /[`~!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\\/]/gi,
            '_'
          )}_payload`
        );
        recursiveObjectSplit(data.payloads, messageInfo.payload.schema, `${messageName}.payload`, data.payloads.length);
      }
    } else {
      data.payloads.push([`${messageName}.payload`, {}]);
      data.relations.push(
        `${messageName.replace(/[`~!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\\/]/gi, '_')} <-- ${messageName.replace(
          /[`~!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\\/]/gi,
          '_'
        )}_payload`
      );
      recursiveObjectSplit(data.payloads, messageInfo.payload, `${messageName}.payload`, data.payloads.length);
    }
  });

  data.messages?.map(([messageName, messageInfo]: [string, any]) => {
    if (!messageInfo.headers) {
      return;
    }
    if (messageInfo.headers.$ref) {
      let parsedRef = String(messageInfo.headers.$ref).split('/');
      let schemas = Object.entries(asyncapi.components?.schemas || {});
      if (
        schemas
          .map(v => {
            return v[0];
          })
          .indexOf(parsedRef[parsedRef.length - 1].replace(/~1/gi, '/')) > -1
      ) {
        data.headers.push([`${messageName}.headers.${parsedRef[parsedRef.length - 1].replace(/~1/gi, '/')}`, {}]);
        data.relations.push(
          `${messageName.replace(/[`~!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\\/]/gi, '_')} <-- ${messageName.replace(
            /[`~!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\\/]/gi,
            '_'
          )}_headers_${parsedRef[parsedRef.length - 1].replace(/~1/gi, '/').replace(/[`~!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\\/]/gi, '_')}`
        );
        recursiveObjectSplit(
          data.headers,
          asyncapi.components?.schemas[parsedRef[parsedRef.length - 1].replace(/~1/gi, '/')],
          `${messageName}.headers.${parsedRef[parsedRef.length - 1].replace(/~1/gi, '/')}`,
          data.headers.length
        );
      }
    } else if (messageInfo.headers.schemaFormat) {
      if (messageInfo.headers.schema?.$ref) {
        let parsedRef = String(messageInfo.headers.schema.$ref).split('/');
        let schemas = Object.entries(asyncapi.components?.schemas || {});
        if (
          schemas
            .map(v => {
              return v[0];
            })
            .indexOf(parsedRef[parsedRef.length - 1].replace(/~1/gi, '/')) > -1
        ) {
          data.headers.push([
            `${messageName}.headers.${parsedRef[parsedRef.length - 1].replace(/~1/gi, '/')}`,
            { schemaFormat: messageInfo.headers.schemaFormat },
          ]);
          data.relations.push(
            `${messageName.replace(/[`~!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\\/]/gi, '_')} <-- ${messageName.replace(
              /[`~!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\\/]/gi,
              '_'
            )}_headers_${parsedRef[parsedRef.length - 1].replace(/~1/gi, '/').replace(/[`~!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\\/]/gi, '_')}`
          );
          recursiveObjectSplit(
            data.headers,
            asyncapi.components?.scheheadersmas[parsedRef[parsedRef.length - 1].replace(/~1/gi, '/')],
            `${messageName}.headers.${parsedRef[parsedRef.length - 1].replace(/~1/gi, '/')}`,
            data.headers.length
          );
        }
      } else {
        data.headers.push([`${messageName}.headers`, { schemaFormat: messageInfo.headers.schemaFormat }]);
        data.relations.push(
          `${messageName.replace(/[`~!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\\/]/gi, '_')} <-- ${messageName.replace(
            /[`~!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\\/]/gi,
            '_'
          )}_headers`
        );
        recursiveObjectSplit(data.headers, messageInfo.headers.schema, `${messageName}.headers`, data.headers.length);
      }
    } else {
      data.headers.push([`${messageName}.headers`, {}]);
      data.relations.push(
        `${messageName.replace(/[`~!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\\/]/gi, '_')} <-- ${messageName.replace(
          /[`~!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\\/]/gi,
          '_'
        )}_headers`
      );
      recursiveObjectSplit(data.headers, messageInfo.headers, `${messageName}.headers`, data.headers.length);
    }
  });

  Object.entries({ ...asyncapi.channels, ...asyncapi.components?.channels } || {}).map(([channelName, channelInfo]: [string, any]) => {
    if (!asyncapi.asyncapi || asyncapi.asyncapi.split('.')[0] !== '2') {
      Object.entries(channelInfo.messages || {}).map(([messageName, messageInfo]: [string, any]) => {
        if (!messageInfo.$ref) {
          if (data.messages.map((v: any[]) => v[0]).indexOf(messageName) === -1) {
            data.messages.push([messageName, messageInfo]);
            data.relations.push(
              `${channelName.replace(/[`~!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\\/]/gi, '_')} <-- ${messageName.replace(
                /[`~!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\\/]/gi,
                '_'
              )}`
            );
          } else {
            data.messages.push([`${channelName}_${messageName}`, messageInfo]);
            data.relations.push(
              `${channelName.replace(/[`~!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\\/]/gi, '_')} <-- ${channelName.replace(
                /[`~!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\\/]/gi,
                '_'
              )}_${messageName.replace(/[`~!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\\/]/gi, '_')}`
            );
          }
        } else {
          let parsedRef = String(messageInfo.$ref).split('/');
          if (data.messages.map((v: any[]) => v[0]).indexOf(parsedRef[parsedRef.length - 1].replace(/~1/gi, '/')) > -1) {
            data.relations.push(
              `${channelName.replace(/[`~!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\\/]/gi, '_')} <-- ${(parsedRef.pop() || '')
                .replace(/~1/gi, '/')
                .replace(/[`~!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\\/]/gi, '_')}`
            );
          }
        }
      });
    } else if (asyncapi.asyncapi.split('.')[0] === '2') {
      Object.entries({ subscribe: channelInfo.subscribe, publish: channelInfo.publish } || {}).map(
        ([operationName, operationInfo]: [string, any]) => {
          if (!operationInfo) {
            return;
          }
          data.operations.push([`${channelName}_${operationName}`, operationInfo]);
          data.relations.push(
            `${channelName.replace(/[`~!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\\/]/gi, '_')} <-- ${channelName.replace(
              /[`~!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\\/]/gi,
              '_'
            )}_${operationName.replace(/[`~!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\\/]/gi, '_')}`
          );
          if (operationInfo.message?.oneOf) {
            operationInfo.message.oneOf.map((message: any) => {
              Object.entries(message).map(([messageName, messageInfo]: [string, any]) => {
                if (messageName === '$ref') {
                  let parsedMsg = String(messageInfo).split('/');
                  let finalMsgStr =
                    data.messages.map((v: any[]) => v[0]).indexOf(`${parsedMsg[parsedMsg.length - 2]}_${parsedMsg[parsedMsg.length - 1]}`) >
                    -1
                      ? `${parsedMsg[parsedMsg.length - 2]}_${parsedMsg[parsedMsg.length - 1]}`
                      : (parsedMsg.pop() || '').replace(/~1/gi, '/');
                  if (data.messages.map((v: any[]) => v[0]).indexOf(finalMsgStr) > -1) {
                    data.relations.push(
                      `${channelName.replace(/[`~!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\\/]/gi, '_')} <-- ${(finalMsgStr || '')
                        .replace(/~1/gi, '/')
                        .replace(/[`~!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\\/]/gi, '_')}`
                    );
                  }
                } else {
                  data.messages.push([`${channelName}_${messageName}`, messageInfo]);
                  data.relations.push(
                    `${channelName.replace(/[`~!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\\/]/gi, '_')} <-- ${channelName.replace(
                      /[`~!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\\/]/gi,
                      '_'
                    )}_${messageName.replace(/[`~!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\\/]/gi, '_')}`
                  );
                }
              });
            });
          } else {
            Object.entries(operationInfo.message).map(([messageName, messageInfo]: [string, any]) => {
              if (messageName === '$ref') {
                let parsedMsg = String(messageInfo).split('/');
                let finalMsgStr =
                  data.messages.map((v: any[]) => v[0]).indexOf(`${parsedMsg[parsedMsg.length - 2]}_${parsedMsg[parsedMsg.length - 1]}`) >
                  -1
                    ? `${parsedMsg[parsedMsg.length - 2]}_${parsedMsg[parsedMsg.length - 1]}`
                    : (parsedMsg.pop() || '').replace(/~1/gi, '/');
                if (data.messages.map((v: any[]) => v[0]).indexOf(finalMsgStr) > -1) {
                  data.relations.push(
                    `${channelName.replace(/[`~!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\\/]/gi, '_')} <-- ${(finalMsgStr || '')
                      .replace(/~1/gi, '/')
                      .replace(/[`~!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\\/]/gi, '_')}`
                  );
                }
              } else {
                if (data.messages.map((v: any[]) => v[0]).indexOf(messageName) === -1) {
                  data.messages.push([messageName, messageInfo]);
                  data.relations.push(
                    `${channelName.replace(/[`~!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\\/]/gi, '_')} <-- ${messageName.replace(
                      /[`~!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\\/]/gi,
                      '_'
                    )}`
                  );
                } else {
                  data.messages.push([`${channelName}_${messageName}`, messageInfo]);
                  data.relations.push(
                    `${channelName.replace(/[`~!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\\/]/gi, '_')} <-- ${channelName.replace(
                      /[`~!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\\/]/gi,
                      '_'
                    )}_${messageName.replace(/[`~!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\\/]/gi, '_')}`
                  );
                }
              }
            });
          }
        }
      );
    }
  });

  Object.entries({ ...asyncapi.operations, ...asyncapi.components?.operations } || {}).map(
    ([operationName, operationInfo]: [string, any]) => {
      if (asyncapi.asyncapi.split('.')[0] !== '2') {
        operationInfo.messages?.map((message: any) => {
          Object.entries(message || {}).map(([messageName, messageInfo]: [string, any]) => {
            let parsedMsg = String(messageInfo).split('/');
            let finalMsgStr =
              data.messages.map((v: any[]) => v[0]).indexOf(`${parsedMsg[parsedMsg.length - 2]}_${parsedMsg[parsedMsg.length - 1]}`) > -1
                ? `${parsedMsg[parsedMsg.length - 2]}_${parsedMsg[parsedMsg.length - 1]}`
                : (parsedMsg.pop() || '').replace(/~1/gi, '/');
            if (data.messages.map((v: any[]) => v[0]).indexOf(finalMsgStr) > -1) {
              data.relations.push(
                `${operationName.replace(/[`~!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\\/]/gi, '_')} <-- ${(finalMsgStr || '')
                  .replace(/~1/gi, '/')
                  .replace(/[`~!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\\/]/gi, '_')}`
              );
            }
          });
        });

        Object.entries(operationInfo.channel || {}).map(([channelName, channelInfo]: [string, any]) => {
          let parsedRef = String(channelInfo).split('/');
          if (data.channels.map((v: any[]) => v[0]).indexOf(parsedRef[parsedRef.length - 1].replace(/~1/gi, '/')) > -1) {
            data.relations.push(
              `${(parsedRef.pop() || '')
                .replace(/~1/gi, '/')
                .replace(/[`~!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\\/]/gi, '_')} <-- ${operationName.replace(
                /[`~!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\\/]/gi,
                '_'
              )}`
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
