/* eslint-disable @typescript-eslint/naming-convention */
import addField from './functions/addField';
export default {
    rules: {
        'asyncapi-info-contact': {
            description: 'Info object must have "contact" object.',
            recommended: true,
            given: '$',
            then: {
                field: 'info',
                function: 'truthy',
            },
            fix: {
                name: 'Quick fix - info.contact',
                given: '$.info',
                field: 'contact',
                function: addField,
            }
        },
        'asyncapi-info-license': {
            description: 'Info object must have "license" object.',
            recommended: true,
            given: '$',
            then: {
                field: 'info.license',
                function: 'truthy',
            },
            fix: {
                name: 'Quick fix - info.license',
                given: '$.info',
                field: 'license',
                function: addField,
            }
        },
        'asyncapi-operation-description': {
            description: 'Operation "description" must be present and non-empty string.',
            recommended: true,
            given: '$.channels.*.[publish,subscribe]',
            then: {
                field: 'description',
                function: 'truthy',
            },
            fix: {
                name: 'Quick fix - Add description for operation',
                given: '$.channels.*.[publish,subscribe]',
                field: 'description',
                function: addField,
            }
        },
    }
};