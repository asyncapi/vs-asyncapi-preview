import {AsyncAPIDocumentInterface } from '@asyncapi/parser';

export default function info(asyncapi:AsyncAPIDocumentInterface) {

    const info = asyncapi.info();
    const defaultContentType = asyncapi.defaultContentType();
    const specId = info.id();
    const termsOfService = info.termsOfService();
    const license = info.license();
    const contact = info.contact();
    const externalDocs = info.externalDocs();
    const extensions: any = info.extensions();

    const infoList = [];
    if (specId) {
      infoList.push(`Specification ID: \`${specId}\``);
    }
    if (license) {
      infoList.push(license.url() ? (
          `License: [${license.name()}](${license.url()})`
      ) : `License: ${license.name()}`);
    }
    if (termsOfService) {
      infoList.push(
        `[${termsOfService}](${termsOfService})`
      );
    }
    if (defaultContentType) {
      infoList.push(
          `Default content type: [${defaultContentType}](https://www.iana.org/assignments/media-types/${defaultContentType})`
      );
    }
    if (contact) {
      if (contact.url()) {
        infoList.push(
            `Support: [${contact.url()}](${contact.name() || 'Link'})`
        );
      }
      if (contact.email()) {
        infoList.push(
            `Email support: [${`mailto:${contact.email()}`}](${contact.email()})`
        );
      }
    }

    return (
        `
# ${info.title()} ${info.version()} documentation
    
${
  infoList.map((value)=>{
    return '\n* '+ value;
  })
}

![${info.title()}](${(extensions.get('x-logo'))?extensions.get('x-logo').value():null})
    
        
#### ${info.description()}
      `);
}  