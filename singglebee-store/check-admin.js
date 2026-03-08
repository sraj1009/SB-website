const mongoose = require('mongoose');

async function checkAdmin() {
    try {
        const conn = await mongoose.connect('mongodb://localhost:27017/singglebee');
        const User = mongoose.models.User || mongoose.model('User', new mongoose.Schema({}, { strict: false }));
        const admins = await User.find({ role: 'admin' });
        console.log('Admins found:', admins.map(a => a.email));
        await conn.disconnect();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkAdmin();
