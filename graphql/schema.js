const { buildSchema } = require("graphql");

module.exports = buildSchema(`


type AuthData {
              token :String!
              userId :String!
}

type Post {
              _id :ID!
              title :String!
              content :String!
              imageUrl :String
              creator :User!
              createdAt:String!
              updatedAt :String!
}

type postData {
              posts :[Post!]!
              totalPosts:Int
}
type User {
              _id :ID!
              name :String!
              email :String!
              password :String
              status :String!
              posts :[Post!]!
}
input userInputData {
              email :String!
              name :String!
              password:String!

}
input postInputData {
              title: String!
              content :String!
              imageUrl :String
}
type RootQuery {
              login(email:String!,password:String! ):AuthData
              getPosts(page:Int!): postData
              getPost(id:ID!):Post!
              user :User!

}
type RootMutation{
              createUser (userInput:userInputData ):User!
              createPost (postInput :postInputData):Post!
              updatePost(id:ID, postInput:postInputData):Post!
              deletePost(id:ID!):Boolean
              updateStatus(status:String!):User!
}


schema {
              
                 mutation :  RootMutation  
                 query :RootQuery        
              
}
`);
