import * as vscode from 'vscode';
import * as ejs from 'ejs';
import * as path from 'path';

export default async function flowchart(asyncapi: any, context: vscode.ExtensionContext) {
    
    const templatePath = path.join(context.extensionPath,'dist', 'components','Flowchart.ejs');
    let data: any = {
        title: asyncapi?.info?.title,
        servers:[...Object.keys(asyncapi.servers || {}),...Object.keys(asyncapi.components?.servers || {})],
        channels:[...Object.keys(asyncapi.channels || {}),...Object.keys(asyncapi.components?.channels || {})],
        operations:[...Object.keys(asyncapi.operations || {}),...Object.keys(asyncapi.components?.operations || {})],
        messages:[...new Set(Object.keys(asyncapi.components?.messages || {}))],
        relations:[]
    };
    Object.entries({...asyncapi.channels,...asyncapi.components?.channels} || {}).map(([channelName, channelInfo]: [string, any]) => {
        if(!asyncapi.asyncapi || asyncapi.asyncapi.split('.')[0] !== '2'){
            Object.entries(channelInfo.messages || {}).map(([messageName, messageInfo]: [string, any]) =>{
                if(!messageInfo.$ref) {
                    if(data.messages.indexOf(messageName) === -1){
                        data.messages.push(messageName);
                        data.relations.push(`${messageName} --> ${channelName}`);
                    }
                    else {
                        data.messages.push(`${channelName}_${messageName}`);
                        data.relations.push(`${channelName}_${messageName} --> ${channelName}`);
                    }
                }else{
                    let parsedRef = String(messageInfo.$ref).split('/');
                    if(data.messages.indexOf(parsedRef[parsedRef.length-1].replace(/~1/gi,"/")) > -1)
                    {data.relations.push(`${(parsedRef.pop() || "").replace(/~1/gi,"/")} --> ${channelName}`);}
                }
            });
            channelInfo.servers?.map((server: any)=>{
                let parsedRef = String(server.$ref).split('/');
                    if(data.servers.indexOf(parsedRef[parsedRef.length-1].replace(/~1/gi,"/")) > -1)
                    {data.relations.push(`${channelName} --> ${(parsedRef.pop() || "").replace(/~1/gi,"/")}`);}
                
            });
        }else if(asyncapi.asyncapi.split('.')[0] === '2'){
            Object.entries({"subscribe": channelInfo.subscribe, "publish": channelInfo.publish} || {}).map(([operationName, operationInfo] : [string, any])=>{
                if(!operationInfo) {return;}
                data.operations.push(`${channelName}_${operationName}`);
                data.relations.push(`${channelName}_${operationName} --> ${channelName}`);
                if(operationInfo.message?.oneOf){
                    operationInfo.message.oneOf.map((message: any)=>{
                        Object.entries(message).map(([messageName,messageInfo]:[string,any])=>{
                            if(messageName === '$ref'){
                                let parsedMsg = String(messageInfo).split('/');
                                let finalMsgStr = (data.messages.indexOf(`${parsedMsg[parsedMsg.length-2].replace(/~1/gi,"/")}_${parsedMsg[parsedMsg.length-1].replace(/~1/gi,"/")}`) > -1)? `${parsedMsg[parsedMsg.length-2].replace(/~1/gi,"/")}_${parsedMsg[parsedMsg.length-1].replace(/~1/gi,"/")}`: ( parsedMsg.pop() || "").replace(/~1/gi,"/");
                                if(data.messages.indexOf(finalMsgStr) > -1) 
                                {data.relations.push(`${finalMsgStr} --> ${channelName}`);}
                            }else{
                                data.messages.push(`${channelName}_${messageName}`);
                                data.relations.push(`${channelName}_${messageName} --> ${channelName}`);
                            }
                        });
                    });
                }else{
                    Object.entries(operationInfo.message).map(([messageName, messageInfo]:[string, any])=>{
                        if(messageName === '$ref'){
                            let parsedMsg = String(messageInfo).split('/');
                            let finalMsgStr = (data.messages.indexOf(`${parsedMsg[parsedMsg.length-2].replace(/~1/gi,"/")}_${parsedMsg[parsedMsg.length-1].replace(/~1/gi,"/")}`) > -1)? `${parsedMsg[parsedMsg.length-2].replace(/~1/gi,"/")}_${parsedMsg[parsedMsg.length-1].replace(/~1/gi,"/")}`: (parsedMsg.pop() || "").replace(/~1/gi,"/"); 
                            if(data.messages.indexOf((finalMsgStr || "").replace(/~1/gi,"/")) > -1) 
                                {data.relations.push(`${(finalMsgStr || "").replace(/~1/gi,"/")} --> ${channelName}`);}
                        }else{
                            if(data.messages.indexOf(messageName) === -1){
                                data.messages.push(`${messageName}`);
                                data.relations.push(`${messageName} --> ${channelName}`);
                            }else{
                                data.messages.push(`${channelName}_${messageName}`);
                                data.relations.push(`${channelName}_${messageName} --> ${channelName}`);
                            }
                        }
                    });
                }
            });
            channelInfo.servers?.map((server: any)=>{
                if(typeof server === "string")
               {data.relations.push(`${channelName} --> ${server.replace(/~1/gi,"/")}`);}              
            });
        }
    });

    Object.entries({...asyncapi.operations, ...asyncapi.components?.operations} || {}).map(([operationName, operationInfo]: [string, any]) => {
        if(asyncapi.asyncapi.split('.')[0] !== '2'){   
            operationInfo.messages?.map((message: any)=> {
                Object.entries(message || {}).map(([messageName, messageInfo]: [string, any])=>{
                    let parsedMsg = String(messageInfo).split('/');
                    let finalMsgStr = (data.messages.indexOf(`${parsedMsg[parsedMsg.length-2].replace(/~1/gi,"/")}_${parsedMsg[parsedMsg.length-1].replace(/~1/gi,"/")}`) > -1)? `${parsedMsg[parsedMsg.length-2].replace(/~1/gi,"/")}_${parsedMsg[parsedMsg.length-1].replace(/~1/gi,"/")}`: (parsedMsg.pop() || "").replace(/~1/gi,"/"); 
                    if(data.messages.indexOf(finalMsgStr) > -1) 
                        {data.relations.push(`${finalMsgStr?.replace(/~1/gi,"/")} --> ${operationName}`);}
                });
            });
            
            Object.entries(operationInfo.channel || {}).map(([channelName, channelInfo]: [string, any])=>{
                let parsedRef = String(channelInfo).split('/');
                if(data.channels.indexOf(parsedRef[parsedRef.length-1].replace(/~1/gi,"/")) > -1)
                {data.relations.push(`${operationName} --> ${(parsedRef.pop() || "").replace(/~1/gi,"/")}`);}
            });
        }
    });

    return await ejs.renderFile(templatePath,{
        ...data
    });
}    