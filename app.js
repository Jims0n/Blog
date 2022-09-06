require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const _ = require("lodash");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require("mongoose-findorcreate");





const homeStartingContent = "Welcome to articlus. Sign up today and express yourself ";
const aboutContent = "Hac habitasse platea dictumst vestibulum rhoncus est pellentesque. Dictumst vestibulum rhoncus est pellentesque elit ullamcorper. Non diam phasellus vestibulum lorem sed. Platea dictumst quisque sagittis purus sit. Egestas sed sed risus pretium quam vulputate dignissim suspendisse. Mauris in aliquam sem fringilla. Semper risus in hendrerit gravida rutrum quisque non tellus orci. Amet massa vitae tortor condimentum lacinia quis vel eros. Enim ut tellus elementum sagittis vitae. Mauris ultrices eros in cursus turpis massa tincidunt dui.";
const contactContent = "Scelerisque eleifend donec pretium vulputate sapien. Rhoncus urna neque viverra justo nec ultrices. Arcu dui vivamus arcu felis bibendum. Consectetur adipiscing elit duis tristique. Risus viverra adipiscing at in tellus integer feugiat. Sapien nec sagittis aliquam malesuada bibendum arcu vitae. Consequat interdum varius sit amet mattis. Iaculis nunc sed augue lacus. Interdum posuere lorem ipsum dolor sit amet consectetur adipiscing elit. Pulvinar elementum integer enim neque. Ultrices gravida dictum fusce ut placerat orci nulla. Mauris in aliquam sem fringilla ut morbi tincidunt. Tortor posuere ac ut consequat semper viverra nam libero.";

const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({limit: '50mb',
extended: true,
parameterLimit:50000}));
app.use(express.static("public"));

app.use(session({
  secret: "Our little secret.",
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());
app.use(function(req,res,next){
  res.locals.currentUser = req.user;
  res.locals.loggedIn = req.isAuthenticated();
  next();
})


mongoose.connect("mongodb+srv://Botterfly:Ope123@cluster0.8pupq.mongodb.net/blogDB", {useNewUrlParser: true});

const userSchema = new mongoose.Schema({
  username: String,
  email: String,
  password: String,
  secret: String
});

const postSchema = new mongoose.Schema ({
  title: String,
  content: String,
  author: String,
  createdAt: Date
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);


const User = mongoose.model("User", userSchema);
const Post = mongoose.model("Post", postSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user  );
  });
});

passport.use(new GoogleStrategy({
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  callbackURL: "http://localhost:3000/auth/google/dashboard",
  userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
},
function(accessToken, refreshToken, profile, cb) {
  
  User.findOrCreate({ password: profile.id, username: profile.displayName }, function (err, user) {
    return cb(err, user);
  });
}
));


app.get("/", function(req, res){

  Post.find({}, function(err, posts){
    res.render("home", {
      startingContent: homeStartingContent,
      posts: posts
    });
  });
  
  
});

app.get("/auth/google",
  passport.authenticate("google", { scope: ["profile"] })
);

app.get("/auth/google/dashboard", 
  passport.authenticate("google", { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect("/dashboard");
  });
app.get("/about", function(req, res){
  res.render("about", {aboutContent: aboutContent});
})

app.get("/contact", function(req, res){
  res.render("contact", {contactContent: contactContent});
})

app.get("/dashboard", function(req, res){

  Post.find({author: req.user.username}, function(err, posts){
    if(req.isAuthenticated()){
      res.render("dashboard",{
        posts: posts
      });
    }else{
      res.redirect("/login");
    }
    
  });
  

  // if(req.isAuthenticated()){
  //   res.render("dashboard");
  // }else{
  //   res.redirect("/login");
  // }
  
});



app.get("/register", function(req, res){
  if (req.isAuthenticated()){
    res.render("dashboard");
  }else{
    res.render("register");
  }
  
})

app.get("/login", function(req, res){
  if (req.isAuthenticated()){
    res.render("dashboard")
  }else{
    res.render("login");
  }
  
})

app.get("/compose", function(req, res){
  if(req.isAuthenticated()){
    res.render("compose");
  }else{
    res.redirect("/login");
  }
  
});

app.get("/logout", function(req, res, next) {
  req.logout(function(err) {
    if (err) { return next(err); }
    res.locals.loggedIn = false;
    res.redirect('/');
  });
});

app.post("/register", function(req, res){


  // bcrypt.hash(req.body.password, saltRounds, function(err, hash){
  //   const newUser = new User({
  //     username: req.body.username,
  //     email: req.body.email,
  //     password: hash
  //   });
  //   newUser.save(function(err){
  //     if (err){
  //       console.log(err);
  //     }else{
  //       res.render("login")
  //     }
  //   })
  // })

User.register({email: req.body.email, username: req.body.username}, req.body.password, function(err, user){
 
  if (err){
    console.log(err);
    res.redirect("register");
  }else{
    passport.authenticate("local")(req, res, function(){
      
      res.redirect("dashboard");
    })
  }
})


});





app.post("/login", function(req, res){
  
  const user = new User({
    username: req.body.username,
    email: req.body.email,
    password: req.body.password
  });
  
  req.login(user, function(err){
    if (err){
      console.log(err);
    }else{
      passport.authenticate("local")(req, res, function(){
        
        res.redirect("dashboard");
        console.log(res.locals.loggedIn);
      });
    }
  });

// User.findOne({email: email}, function(err, foundUser){
//   if (err){
//     console.log(err);
//   }else{
//     if(foundUser){
//       bcrypt.compare(password, foundUser.password, function(err, result){
//         if (result === true){
//           res.render("dashboard");
//         }
//       })
//     }
//   }
// })   
});
  

app.post("/dashboard", function(req, res){
  if(req.isAuthenticated()){
    res.render("compose");
  }else{
    res.redirect("/login");
  }
  
})

app.post("/compose", function(req, res){
  const post = new Post ({
    title: req.body.postTitle,
    content: req.body.postBody,
    author: req.user.username,
    createdAt: new Date
  });

post.save(function(err){
  if(!err){
    res.redirect("/");
  }else{
    console.log(err);
  }
});

  
});


app.get("/post/:postId", function(req, res){
const requestedPostId = req.params.postId;

Post.findOne({_id: requestedPostId}, function(err, post){
  res.render("post", {
    postTitle: post.title,
    postContent: post.content,
    postAuthor: post.author
  });
})



});

app.post("/post/:postId", function(req, res){
requestedId = req.params.postId

  Post.deleteOne({
    _id: requestedId
  },function(err){
    if(!err){
      res.redirect("/dashboard")
    }else{
      res.send(err);
    }
  });
});

// app.patch("/post/:postId", function(req, res){
//   updatePostId = req.params.postId;
//   Post.updateOne(
//     {_id: updatePostId},
//     {$set: req.body},function(err){
//       if(!err){
//         res.redirect("/compose")
//       }else{
//         res.send(err);
//       }
//     }
//   )
// });



let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}

app.listen(port, function(){
console.log("Server started sucessfully");
}) 

//C:\Program Files\MongoDB\Server\5.0\data\   
