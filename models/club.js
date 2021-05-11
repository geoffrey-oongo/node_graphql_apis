const mongoose = require("mongoose")
const Schema = mongoose.Schema;

const clubSchema = new Schema( {

    name :{
        required :true,
        type :String
    },
    league:{
        required :true,
        type :String
    },
    stadium :{
        required :true,
        type: String
    }
})

module.exports =mongoose.model('Club', clubSchema)