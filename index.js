const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 5002;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
app.use(cors());
app.use(express.json());
// Mongodb connection
const uri =
  "mongodb+srv://dbuser1:6y31jkJ0abHof58O@cluster0.nsrps5u.mongodb.net/?retryWrites=true&w=majority";

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

// every api's inside run()

async function run() {
  try {
    await client.connect();
    const userCollection = client.db("userdb").collection("users");
    const chatRoomInfoCollection = client
      .db("Chatsdb")
      .collection("chatRoomInfo");
    const chatRoomMsgCollection = client.db("ChatMsgdb");

    app.post("/users", async (req, res) => {
      const userData = req.body;
      console.log(userData);
      const result = await userCollection.insertOne(userData);
      res.send(result);
      console.log("data added");
    });
    app.get("/users", async (req, res) => {
      const query = {};
      const cursor = await userCollection.find(query);
      const users = await cursor.toArray();
      res.send(users);
    });
    //   individual user
    app.get("/user/:email", async (req, res) => {
      const query = {};
      const email = req.params.email;
      //   console.log(email);
      const cursor = await userCollection.find(query);
      const users = await cursor.toArray();
      const user = users.find((item) => item.email === email);
      if (user) {
        res.send(user);
      } else {
        res.send({});
      }
    });
    //   individul user profile update
    app.put("/user/:email", async (req, res) => {
      const useremail = req.params.email;
      const userData = req.body;
      const filter = { email: useremail };
      const options = { upsert: true };

      const remainingUserData = await userCollection.findOne(filter, {});
      console.log("old data", remainingUserData);

      const updatedName = userData.name;
      const updatedImgLink = userData.imgLink;
      const updatedUser = {
        $set: {
          name: updatedName,
          imgLink: updatedImgLink,
        },
      };
      const result = await userCollection.updateOne(
        filter,
        updatedUser,
        options
      );
      res.send(result);
      console.log(result);
    });
    //   making collection for storing messages in uuidpost api

    app.post("/userchatscollection", async (req, res) => {
      const receivedData = req.body;
      const newCollection = chatRoomMsgCollection.collection(
        receivedData.chatRoomID
      );

      const result = await newCollection.insertOne(receivedData);
      // const result = { status: "sending in chatmsg collection" };
      res.send(result);
      console.log("msg added to charRoomMsgDb Collection DB", receivedData);
    });
    // getting all chat msgcollection msges
    app.get("/userchatscollection/:id", async (req, res) => {
      const chatRoomId = req.params.id;
      console.log(chatRoomId);
      const requiredCollection = await chatRoomMsgCollection.collection(
        chatRoomId
      );
      const query = {};
      const cursor = requiredCollection.find(query);
      const result = await cursor.toArray();
      console.log(result);
      if (result) {
        res.send(result);
      }
    });
    //   creating chatroominfo collection post api

    app.post("/userchatcollection", async (req, res) => {
      const receivedData = req.body;
      console.log("inside chat rooms info", receivedData);
      const result = await chatRoomInfoCollection.insertOne(receivedData);
      // const result = { status: "sending in chatroom info" };
      res.send(result);
      console.log("data added to charRoomInfo Collection DB");
    });
    // getting all chatroom information
    app.get("/userchatcollection", async (req, res) => {
      const cursor = chatRoomInfoCollection.find({});
      const result = await cursor.toArray();
      res.send(result);
    });
    // getting inboxed member info from chatroomInfo collection and userCollection

    app.get("/inboxedUser/:key", async (req, res) => {
      const key = req.params.key.split("*");
      const cursor = await chatRoomInfoCollection.findOne({
        chatRoomID: key[1],
      });
      let otherMember;
      if (key[0] !== cursor.members[0]) {
        otherMember = cursor.members[0];
      } else {
        otherMember = cursor.members[1];
      }
      const otherMemberInfo = await userCollection.findOne({
        email: otherMember,
      });
      const { _id, name, email, time, imgLink, chats, groups } =
        otherMemberInfo;
      const cursor1 = chatRoomMsgCollection.collection(key[1]).find();
      const lastmsg = await cursor1.toArray();
      const chatInfo = {
        _id: _id,
        name: name,
        email: email,
        time: time,
        imgLink: imgLink,
        chats: chats,
        groups: groups,
        lastmsg: lastmsg[lastmsg.length - 1],
      };
      // const cursor = await userCollection.find({ email: key });
      res.send(chatInfo);
    });

    // searching for individual chatroom id and returning data
    app.get("/prechatcollection/:email", async (req, res) => {
      let data = req.params.email;
      let arr = data.split("*");
      console.log("+++++++++++++++++++++++++++++++++++++");
      // console.log(arr);
      const query = {};
      const result = await chatRoomInfoCollection.find(query);
      const chatRooms = await result.toArray();
      // console.log("the chat rooms are", chatRooms);
      // res.send({ hola: "yes" });

      if (chatRooms.length === 0) {
        res.send({ id: null, status: "not found" });
      }
      if (chatRooms.length !== 0) {
        let chatRoomID;
        for (const it of chatRooms) {
          // console.log(it);
          // const chat = [...it.members];
          // console.log("chat room infos", chat[0], chat[1]);
          if (
            (arr[0] == it.members[0] || arr[0] == it.members[1]) &&
            (arr[1] == it.members[0] || arr[1] == it.members[1])
          ) {
            // console.log("found");
            chatRoomID = it.chatRoomID;
            // res.send({ id: it.chatRoomID, status: "found" });
            break;
          }
        }
        if (chatRoomID) {
          console.log("found");
          res.send({ id: chatRoomID, status: "found" });
        } else {
          console.log("not found");
          res.send({ id: null, status: "not found" });
        }
      }
      console.log("------------------------------");
    });

    // updating chatmsg collection via chatroomid

    app.post("/usermsgchatscollection", async (req, res) => {
      const data = req.body;
      console.log(data);
      const result = await chatRoomMsgCollection
        .collection(data.chatRoomID)
        .insertOne(data);
      res.send(result);
    });

    // both  Indiviual user first chat array update
    app.put("/userchat", async (req, res) => {
      const userchat = req.body;
      const filter1 = { email: userchat.user1 };
      const filter2 = { email: userchat.user2 };
      const chatRoomID = req.body.chatRoomID;
      console.log(filter1, filter2, chatRoomID);

      const options = { upsert: true };

      const firstUserData = await userCollection.findOne(filter1, {});
      const secondUserData = await userCollection.findOne(filter2, {});

      const updatedChats1 = [...firstUserData.chats, chatRoomID];
      const updatedChats2 = [...secondUserData.chats, chatRoomID];
      //   console.log("updated chats", updatedChats);

      const updatedUser1 = {
        $set: {
          chats: updatedChats1,
        },
      };
      const updatedUser2 = {
        $set: {
          chats: updatedChats2,
        },
      };
      const result1 = await userCollection.updateOne(
        filter1,
        updatedUser1,
        options
      );
      const result2 = await userCollection.updateOne(
        filter2,
        updatedUser2,
        options
      );
      res.send([result1, result2]);
      //   console.log(result);
    });
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);
app.get("/", (req, res) => {
  res.send("Server is started and allowing data on website");
});
const users = [
  //   {
  //     id: 1,
  //     name: "Adil",
  //     email: "jacobfrye3251@gmail.com",
  //     time: "10:20",
  //     chats: ["1234"],
  //     imgLink:
  //       "https://ichef.bbci.co.uk/news/976/cpsprodpb/172F3/production/_123036949_gettyimages-1235149869.jpg",
  //   },
  {
    id: 2,
    name: "Otilia",
    email: "cse_1832020032@lus.ac.bd",
    time: "10:20",
    chats: ["1234"],
    imgLink:
      "https://lyricstranslate.com/files/styles/artist/public/loadimage.jpg",
  },
  {
    id: 3,
    name: "Maruf",
    email: "cse_1832020018@lus.ac.bd",
    time: "10:20",
    chats: ["1234"],
    imgLink:
      "https://cdn.britannica.com/61/137461-050-BB6C5D80/Brad-Pitt-2008.jpg",
  },
];

app.listen(port, () => {
  console.log("Server started at port ", port);
});
