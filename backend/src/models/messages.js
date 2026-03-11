import mongoose from 'mongoose';


const messagesSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        doctorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Doctor",
            required: true
        },
        patienEmail:{
            type: String,
            required: true,
        },
        patienName: {
            type: String,
            required: true,
        },
        Messges: {
            type: String,
            required: true,
        },
        body:{
            type: String,
            required: true,
        }
    },
    {
        timestamps: true
    }
);
const Messges = mongoose.model('Messges', messagesSchema);
export default Messges;