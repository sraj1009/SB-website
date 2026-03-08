const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

async function createAdmin() {
    try {
        const conn = await mongoose.connect('mongodb://localhost:27017/singglebee');
        const UserSchema = new mongoose.Schema({
            name: String,
            email: { type: String, unique: true },
            passwordHash: String,
            role: { type: String, default: 'customer' },
            emailVerified: Date
        }, { timestamps: true });

        const User = mongoose.models.User || mongoose.model('User', UserSchema);

        const email = 'tester@admin.com';
        const password = 'Admin123!';
        const salt = await bcrypt.genSalt(12);
        const passwordHash = await bcrypt.hash(password, salt);

        await User.deleteOne({ email });
        await User.create({
            name: 'Test Admin',
            email,
            passwordHash,
            role: 'admin',
            emailVerified: new Date()
        });

        console.log('Admin user created successfully: tester@admin.com / Admin123!');
        await conn.disconnect();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

createAdmin();
