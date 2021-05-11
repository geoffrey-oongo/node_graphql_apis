const mongoose = require('mongoose')

const Schema = mongoose.Schema
const playerSchema =  new Schema( { 
    name :{
        type :String,
        required : true
    },
    position:{
        type :String,
        required: true
    },
    overall :{
        type:Number,
        required :true

    },
    club :{
        type :Object,
        required :true
    },

    country :String
}
)

module.exports = mongoose.model('Player', playerSchema)