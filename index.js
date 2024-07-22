import { createServer } from "node:http";
import { createSchema, createYoga } from "graphql-yoga";
import { PubSub, withFilter } from "graphql-subscriptions";
import { nanoid } from "nanoid";
import { promises as fs } from "node:fs";

// Read JSON data from file asynchronously
async function readData() {
  const data = await fs.readFile("./data.json", "utf-8");
  return JSON.parse(data);
}

// Provide your schema
const pubsub = new PubSub();

const yoga = createYoga({
  schema: createSchema({
    typeDefs: /* GraphQL */ `
      type User {
        id: ID!
        username: String!
        email: String!
        events: [Event!]!
        event(id: ID): Event
      }

      input createUserInput {
        username: String!
        email: String!
      }

      input updateUserInput {
        username: String
        email: String
      }

      type Event {
        id: ID!
        title: String!
        desc: String!
        date: String!
        from: String!
        to: String!
        location_id: ID!
        user_id: ID!
        user: User!
        participants: [Participant!]!
        location: Location!
      }

      input createEventInput {
        title: String!
        desc: String!
        date: String!
        from: String
        to: String
        location_id: ID
        user_id: ID
      }

      input updateEventInput {
        title: String
        desc: String
        date: String
        from: String
        to: String
        location_id: ID
        user_id: ID
      }

      type Location {
        id: ID!
        name: String!
        desc: String!
        lat: Float!
        lng: Float!
      }

      input createLocationInput {
        name: String!
        desc: String!
        lat: Float!
        lng: Float!
      }

      input updateLocationInput {
        id: ID
        name: String
        desc: String
        lat: Float
        lng: Float
      }

      type Participant {
        id: ID!
        user_id: ID!
        event_id: ID!
        user: User!
        event: Event!
      }

      input createParticipantInput {
        user_id: ID!
        event_id: ID!
      }

      input updateParticipantInput {
        id: ID
        user_id: ID
        event_id: ID
      }

      type DeleteAllOutput {
        count: Int!
      }

      type Query {
        users: [User!]!
        user(id: ID!): User

        events: [Event!]!
        event(id: ID!): Event

        locations: [Location!]
        location(id: ID!): Location

        participants: [Participant!]!
        participant(id: ID!): Participant
      }

      type Mutation {
        addUser(data: createUserInput!): User!
        updateUser(id: ID!, data: updateUserInput!): User!
        deleteUser(id: ID!): User!
        deleteAllUsers: DeleteAllOutput!

        addEvent(data: createEventInput!): Event!
        updateEvent(id: ID!, data: updateEventInput!): Event!
        deleteEvent(id: ID!): Event!
        deleteAllEvents: DeleteAllOutput!

        addLocation(data: createLocationInput!): Location!
        updateLocation(id: ID!, data: updateLocationInput!): Location!
        deleteLocation(id: ID!): Location!
        deleteAllLocations: DeleteAllOutput!

        addParticipant(data: createParticipantInput!): Participant!
        updateParticipant(id: ID!, data: updateParticipantInput!): Participant!
        deleteParticipant(id: ID!): Participant!
        deleteAllParticipants: DeleteAllOutput!
      }
      type Subscription {
        count: Int!
        # User
        userCreated(id: ID): User!
        userUpdated: User!
        userDeleted: User!

        # Event
        eventCreated(user_id: ID): Event!
        eventUpdated: Event!
        eventDeleted: Event!
        eventCount: Int!

        # Location
        locationCreated: Location!
        locationUpdated: Location!
        locationDeleted: Location!

        # Participant
        participantAdded(user_id: ID): Participant!
        participantUpdated: Participant!
        participantDeleted: Participant!
      }
    `,
    resolvers: {
      Query: {
        users: async () => {
          const data = await readData();
          return data.users;
        },
        user: async (_, { id }) => {
          const data = await readData();
          return data.users.find((user) => user.id === id);
        },
        events: async () => {
          const data = await readData();
          return data.events;
        },
        event: async (_, { id }) => {
          const data = await readData();
          return data.events.find((event) => event.id === id);
        },
        locations: async () => {
          const data = await readData();
          return data.locations;
        },
        location: async (_, { id }) => {
          const data = await readData();
          return data.locations.find((location) => location.id === id);
        },
        participants: async () => {
          const data = await readData();
          return data.participants;
        },
        participant: async (_, { id }) => {
          const data = await readData();
          return data.participants.find((participant) => participant.id === id);
        },
      },

      Subscription: {
        // User
        userCreated: {
          subscribe: (_, __, { pubsub }) => pubsub.asyncIterator("userCreated"),
          resolve: (payload) => payload,
        },
        userUpdated: {
          subscribe: (_, __, { pubsub }) => pubsub.asyncIterator("userUpdated"),
        },
        userDeleted: {
          subscribe: (_, __, { pubsub }) => pubsub.asyncIterator("userDeleted"),
        },

        // Event
        eventCreated: {
          subscribe: withFilter(
            () => pubsub.asyncIterator("eventCreated"),
            (payload, variables) => {
              console.log("payload", payload);
              console.log("variables", variables);

              return variables.user_id
                ? payload.eventCreated.user_id === variables.user_id
                : true;
            }
          ),
        },
        eventUpdated: {
          subscribe: () => pubsub.asyncIterator("eventUpdated"),
        },
        eventDeleted: {
          subscribe: () => pubsub.asyncIterator("eventDeleted"),
        },
        eventCount: {
          subscribe: () => {
            setTimeout(() => {
              pubsub.publish("eventCount", { eventCount: events.length });
            });

            return pubsub.asyncIterator("eventCount");
          },
        },

        // Location
        locationCreated: {
          subscribe: () => pubsub.asyncIterator("locationCreated"),
        },
        locationUpdated: {
          subscribe: () => pubsub.asyncIterator("locationUpdated"),
        },
        locationDeleted: {
          subscribe: () => pubsub.asyncIterator("locationDeleted"),
        },

        // Participant
        participantAdded: {
          subscribe: withFilter(
            () => pubsub.asyncIterator("participantAdded"),
            (payload, variables) => {
              console.log("payload", payload);
              console.log("variables", variables);
              return variables.user_id
                ? payload.participantAdded.user_id === variables.user_id
                : true;
            }
          ),
        },
        participantUpdated: {
          subscribe: () => pubsub.asyncIterator("participantUpdated"),
        },
        participantDeleted: {
          subscribe: () => pubsub.asyncIterator("participantDeleted"),
        },
      },

      Mutation: {
        addUser: async (_, { data }) => {
          const jsonData = await readData();
          const users = jsonData.users;
          const user = {
            id: String(users.length + 1),
            ...data,
          };
          users.push(user);
          pubsub.publish("userCreated", { userCreated: user });
          return user;
        },

        updateUser: async (_, { id, data }) => {
          const jsonData = await readData();
          const users = jsonData.users;
          const user_index = users.findIndex(
            (user) => user.id === parseInt(id)
          );
          if (user_index === -1) {
            throw new Error("User not found");
          }
          const updated_user = (users[user_index] = {
            ...users[user_index],
            ...data,
          });
          pubsub.publish("userUpdated", { userUpdated: updated_user });

          return updated_user;
        },

        deleteUser: async (_, { id }) => {
          const jsonData = await readData();
          const users = jsonData.users;
          const user_index = users.findIndex(
            (user) => user.id === parseInt(id)
          );

          if (user_index === -1) {
            throw new Error("User not found");
          }

          const user = users[user_index];

          users.splice(user_index, 1);

          pubsub.publish("userDeleted", { userDeleted: user });

          return user;
        },

        deleteAllUsers: async () => {
          const jsonData = await readData();
          const length = jsonData.users.length;
          jsonData.users.splice(0, length);
          return {
            count: length,
          };
        },

        // Event
        addEvent: async (_, { data }) => {
          const jsonData = await readData();
          const events = jsonData.events;

          const event = {
            id: nanoid(),
            ...data,
          };
          events.push(event);

          pubsub.publish("eventCreated", { eventCreated: event });
          return event;
        },

        updateEvent: async (_, { id, data }) => {
          const jsonData = await readData();
          const events = jsonData.events;

          const event_index = events.findIndex(
            (event) => event.id === parseInt(id)
          );

          if (event_index === -1) {
            throw new Error("Event not found");
          }

          const updated_event = (events[event_index] = {
            ...events[event_index],
            ...data,
          });
          pubsub.publish("eventUpdated", { eventUpdated: updated_event });

          return updated_event;
        },

        deleteEvent: async (_, { id }) => {
          const jsonData = await readData();
          const events = jsonData.events;
          const event_index = events.findIndex(
            (event) => event.id === parseInt(id)
          );

          if (event_index === -1) {
            throw new Error("Event not found");
          }

          const event = events[event_index];

          events.splice(event_index, 1);

          pubsub.publish("eventDeleted", { eventDeleted: event });

          return event;
        },

        deleteAllEvents: async () => {
          const jsonData = await readData();
          const length = jsonData.events.length;
          jsonData.events.splice(0, length);
          return {
            count: length,
          };
        },

        // Location
        addLocation: async (_, { data }) => {
          const jsonData = await readData();
          const locations = jsonData.locations;

          const location = {
            id: nanoid(),
            ...data,
          };
          locations.push(location);

          pubsub.publish("locationCreated", { locationCreated: location });

          return location;
        },

        updateLocation: async (_, { id, data }) => {
          const jsonData = await readData();
          const locations = jsonData.locations;

          const location_index = locations.findIndex(
            (location) => location.id === parseInt(id)
          );

          if (location_index === -1) {
            throw new Error("Location not found");
          }

          const updated_location = (locations[location_index] = {
            ...locations[location_index],
            ...data,
          });

          pubsub.publish("locationUpdated", {
            locationUpdated: updated_location,
          });

          return updated_location;
        },

        deleteLocation: async (_, { id }) => {
          const jsonData = await readData();
          const locations = jsonData.locations;
          const location_index = locations.findIndex(
            (location) => location.id === parseInt(id)
          );

          if (location_index === -1) {
            throw new Error("Location not found");
          }

          const location = locations[location_index];

          locations.splice(location_index, 1);

          pubsub.publish("locationDeleted", { locationDeleted: location });

          return location;
        },

        deleteAllLocations: async () => {
          const jsonData = await readData();
          const length = jsonData.locations.length;
          jsonData.locations.splice(0, length);
          return {
            count: length,
          };
        },

        // Participant
        addParticipant: async (_, { data }) => {
          const jsonData = await readData();
          const participants = jsonData.participants;

          const participant = {
            id: nanoid(),
            ...data,
          };

          participants.push(participant);

          pubsub.publish("participantAdded", {
            participantAdded: participant,
          });

          return participant;
        },

        updateParticipant: async (_, { id, data }) => {
          const jsonData = await readData();
          const participants = jsonData.participants;

          const participant_index = participants.findIndex(
            (participant) => participant.id === parseInt(id)
          );

          if (participant_index === -1) {
            throw new Error("Participant not found");
          }

          const updated_participant = (participants[participant_index] = {
            ...participants[participant_index],
            ...data,
          });

          pubsub.publish("participantUpdated", {
            participantUpdated: updated_participant,
          });

          return updated_participant;
        },

        deleteParticipant: async (_, { id }) => {
          const jsonData = await readData();
          const participants = jsonData.participants;
          const participant_index = participants.findIndex(
            (participant) => participant.id === parseInt(id)
          );

          if (participant_index === -1) {
            throw new Error("Participant not found");
          }

          const participant = participants[participant_index];

          participants.splice(participant_index, 1);

          pubsub.publish("participantDeleted", {
            participantDeleted: participant,
          });

          return participant;
        },

        deleteAllParticipants: async () => {
          const jsonData = await readData();
          const length = jsonData.participants.length;
          jsonData.participants.splice(0, length);
          return {
            count: length,
          };
        },
      },
      User: {
        events: async (parent) => {
          const jsonData = await readData();
          return jsonData.events.filter((event) => event.user_id === parent.id);
        },
        event: async (parent, { id }) => {
          const jsonData = await readData();
          return jsonData.events.find((event) => event.id === id);
        },
      },
      Event: {
        user: async (parent) => {
          const jsonData = await readData();
          return jsonData.users.find((user) => user.id === parent.user_id);
        },
        participants: async (parent) => {
          const jsonData = await readData();
          return jsonData.participants.filter(
            (participant) => participant.event_id === parent.id
          );
        },
        location: async (parent) => {
          const jsonData = await readData();
          return jsonData.locations.find(
            (location) => location.id === parent.location_id
          );
        },
      },
      Participant: {
        user: async (parent) => {
          const jsonData = await readData();
          return jsonData.users.find((user) => user.id === parent.user_id);
        },
        event: async (parent) => {
          const jsonData = await readData();
          return jsonData.events.find((event) => event.id === parent.event_id);
        },
      },
    },
  }),
  context: ({ req, res }) => ({ pubsub, req, res }),
});

const server = createServer(yoga);

server.listen(4000, () => {
  console.info("Server is running on http://localhost:4000/garphql");
});
