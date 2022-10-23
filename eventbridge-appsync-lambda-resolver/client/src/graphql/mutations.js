/* eslint-disable */
// this is an auto generated file. This will be overwritten

export const createMessage = /* GraphQL */ `
  mutation CreateMessage($topic: String!, $text: String!) {
    createMessage(topic: $topic, text: $text) {
      id
      topic
      text
    }
  }
`;
export const updateMessage = /* GraphQL */ `
  mutation UpdateMessage($id: ID!, $topic: String!, $text: String!) {
    updateMessage(id: $id, topic: $topic, text: $text) {
      id
      topic
      text
    }
  }
`;
export const deleteMessage = /* GraphQL */ `
  mutation DeleteMessage($id: ID!) {
    deleteMessage(id: $id) {
      id
      topic
      text
    }
  }
`;
