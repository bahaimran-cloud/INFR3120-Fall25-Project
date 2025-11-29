const { trim, type } = require('jquery');
let mongoose = require('mongoose');
let passportLocalMongoose = require('passport-local-mongoose');
const { collection } = require('./JobApplication');

let User = mongoose.Schema({
    username:
    {
        type:String,
        default:"",
        trim:true,
        required:'Username is required'
    },
    /* password:
    {
        type:String,
        default:"",
        trim:true,
        required:'Password is required'
    },*/
    email:
    {
        type:String,
        default:"",
        trim:true,
        required:'email is required'
    },
    displayName:
    {
        type:String,
        default:"",
        trim:true,
        required:'displayName is required'
    },
    avatar:
    {
        type:String,
        default:"/content/images/default-avatar.png",
        trim:true
    },
    created:
    {
        type:Date,
        default:Date.now
    },
    updated:
    {
        type:Date,
        default:Date.now
    }
},
{
    collection:"user"
}
)
let options = ({MissingPasswordError:'Wrong/Missing Password'});
User.plugin(passportLocalMongoose,options);
module.exports.User = mongoose.model('User',User);
