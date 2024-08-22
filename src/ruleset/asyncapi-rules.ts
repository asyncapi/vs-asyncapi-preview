/* eslint-disable @typescript-eslint/naming-convention */
import addField from './functions/addField';
import deleteEndingSlash from './functions/deleteEndingSlash';
import latestVersionUpdate from './functions/latestVersionUpdate';
import deleteEmptyParam from './functions/deleteEmptyParam';
import deleteID from './functions/deleteID';
import deleteRepeatedTags from './functions/deleteRepeatedTags';
import renameRepeatedTag from './functions/renameRepeatedTag';
import addDescription from './functions/addDescription';
import deleteEmptyVariables from './functions/deleteEmptyVariables';
import updateURL from './functions/updateURL';

export default {
    rules: {
        'asyncapi-channel-no-trailing-slash': {
            description: 'Channel path must not end with slash.',
            recommended: true,
            given: '$',
            fix: {
                name: 'Quick fix - Delete ending slashes of channel paths',
                given: '$.channels.',
                field: '',
                function: deleteEndingSlash,
            }
        },
        'asyncapi-server-no-trailing-slash': {
            description: 'Server URL must not end with slash.',
            recommended: true,
            given: '$',
            fix: {
                name: 'Quick fix - Delete ending slashes of server urls',
                given: '$.servers.*',
                field: 'url',
                function: deleteEndingSlash,
            }
        },
        'asyncapi-info-contact-properties': {
            description: 'Contact object must have "name", "url" and "email".',
            recommended: true,
            given: '$',
            fix: {
                name: 'Quick fix - Add missing property to contact object',
                given: '$.info',
                field: 'contact',
                function: addField,
            }
        },
        'asyncapi-info-contact': {
            description: 'Info object must have "contact" object.',
            recommended: true,
            given: '$',
            fix: {
                name: 'Quick fix - Add contact object to info',
                given: '$.info',
                field: 'contact',
                function: addField,
            }
        },
        "asyncapi-info-description": {
            description: 'Info "description" must be present and non-empty string.',
            recommended: true,
            given: "$",
            fix: {
                name: 'Quick fix - Add description object to info',
                given: '$.info',
                field: 'description',
                function: addField
            }
        },
        'asyncapi-info-license': {
            description: 'Info object must have "license" object.',
            recommended: true,
            given: '$',
            fix: {
                name: 'Quick fix - Add license object to info',
                given: '$.info',
                field: 'license',
                function: addField,
            }
        },
        'asyncapi-operation-description': {
            description: 'Operation "description" must be present and non-empty string.',
            recommended: true,
            given: '$.channels.*.[publish,subscribe]',
            fix: {
                name: 'Quick fix - Add description for operation',
                given: '$.channels.*.[publish,subscribe]',
                field: 'description',
                function: addDescription,
            }
        },
        'asyncapi-latest-version': {
            description: 'Checking if the AsyncAPI document is using the latest version.',
            recommended: true,
            given: "$",
            fix: {
                name: 'Quick fix - Update the version to latest',
                given: '$',
                field: 'asyncapi',
                function: latestVersionUpdate,
            }
        },
        'asyncapi-tags': {
            description: 'AsyncAPI object must have non-empty "tags" array.',
            recommended: true,
            given: "$",
            fix: {
                name: 'Quick fix - Add tags',
                given: '$',
                field: 'tags',
                function: addField,
            }
        },
        'asyncapi-channel-no-empty-parameter': {
            description: 'Channel path must not have empty parameter substitution pattern.',
            recommended: true,
            given: "$",
            fix: [
                {
                    name: 'Quick fix - delete empty params',
                    given: '$.channels.',
                    field: '',
                    function: deleteEmptyParam
                }
            ]
        },
        "asyncapi-message-messageId-uniqueness": {
            description: 'messageId must be unique across all the messages (except those one defined in the components)',
            recommended: true,
            given: "$",
            fix: [
                {
                    name: 'Quick fix - delete messageId',
                    given: '$.channels.',
                    field: 'messsageId',
                    function: deleteID
                }
            ]
        },
        "asyncapi-operation-operationId-uniqueness": {
            description: '"operationId" must be unique across all the operations.',
            recommended: true,
            given: "$",
            fix: [
                {
                    name: 'Quick fix - delete operationId',
                    given: '$.channels[*][publish,subscribe]',
                    field: 'operationId',
                    function: deleteID
                }
            ]
        },
        "asyncapi-tags-uniqueness": {
            description: 'Each tag must have a unique name.',
            recommended: true,
            given: "$",
            fix: [
                {
                    name: 'Quick fix - delete repeated tag',
                    given:
                        [
                            // root
                            '$.tags',
                            // servers
                            '$.servers.*.tags',
                            '$.components.servers.*.tags',
                            // operations
                            '$.channels.*.[publish,subscribe].tags',
                            '$.components.channels.*.[publish,subscribe].tags',
                            // operation traits
                            '$.channels.*.[publish,subscribe].traits.*.tags',
                            '$.components.channels.*.[publish,subscribe].traits.*.tags',
                            '$.components.operationTraits.*.tags',
                            // messages
                            '$.channels.*.[publish,subscribe].message.tags',
                            '$.channels.*.[publish,subscribe].message.oneOf.*.tags',
                            '$.components.channels.*.[publish,subscribe].message.tags',
                            '$.components.channels.*.[publish,subscribe].message.oneOf.*.tags',
                            '$.components.messages.*.tags',
                            // message traits
                            '$.channels.*.[publish,subscribe].message.traits.*.tags',
                            '$.channels.*.[publish,subscribe].message.oneOf.*.traits.*.tags',
                            '$.components.channels.*.[publish,subscribe].message.traits.*.tags',
                            '$.components.channels.*.[publish,subscribe].message.oneOf.*.traits.*.tags',
                            '$.components.messages.*.traits.*.tags',
                            '$.components.messageTraits.*.tags',
                        ],
                    field: 'tags',
                    function: deleteRepeatedTags
                },
                {
                    name: 'Quick fix - rename repeated tag',
                    given:
                        [
                            // root
                            '$.tags',
                            // servers
                            '$.servers.*.tags',
                            '$.components.servers.*.tags',
                            // operations
                            '$.channels.*.[publish,subscribe].tags',
                            '$.components.channels.*.[publish,subscribe].tags',
                            // operation traits
                            '$.channels.*.[publish,subscribe].traits.*.tags',
                            '$.components.channels.*.[publish,subscribe].traits.*.tags',
                            '$.components.operationTraits.*.tags',
                            // messages
                            '$.channels.*.[publish,subscribe].message.tags',
                            '$.channels.*.[publish,subscribe].message.oneOf.*.tags',
                            '$.components.channels.*.[publish,subscribe].message.tags',
                            '$.components.channels.*.[publish,subscribe].message.oneOf.*.tags',
                            '$.components.messages.*.tags',
                            // message traits
                            '$.channels.*.[publish,subscribe].message.traits.*.tags',
                            '$.channels.*.[publish,subscribe].message.oneOf.*.traits.*.tags',
                            '$.components.channels.*.[publish,subscribe].message.traits.*.tags',
                            '$.components.channels.*.[publish,subscribe].message.oneOf.*.traits.*.tags',
                            '$.components.messages.*.traits.*.tags',
                            '$.components.messageTraits.*.tags',
                        ],
                    field: 'tags',
                    function: renameRepeatedTag
                }
            ]
        },
        "asyncapi-server-no-empty-variable": {
            description: 'Server URL must not have empty variable substitution pattern.',
            recommended: true,
            given: '$.servers[*].url',
            fix: [
                {
                    name: 'Quick fix - delete empty variables',
                    given: '',
                    field: '',
                    function: deleteEmptyVariables
                },
                {
                    name: 'Quick fix - Update url',
                    given: '',
                    field: '',
                    function: updateURL
                }
            ]
        }
    }
};