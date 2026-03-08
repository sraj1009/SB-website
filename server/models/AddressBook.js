import mongoose from 'mongoose';

const addressSchema = new mongoose.Schema({
    label: {
        type: String,
        trim: true,
        maxlength: 50,
        default: 'Home'
    },
    fullName: {
        type: String,
        required: true,
        trim: true
    },
    phone: {
        type: String,
        required: true,
        match: [/^[0-9]{10}$/, 'Phone must be 10 digits']
    },
    street: {
        type: String,
        required: true,
        trim: true
    },
    landmark: {
        type: String,
        trim: true
    },
    city: {
        type: String,
        required: true,
        trim: true
    },
    state: {
        type: String,
        required: true,
        trim: true
    },
    zipCode: {
        type: String,
        required: true,
        match: [/^[0-9]{6}$/, 'ZIP code must be 6 digits']
    },
    country: {
        type: String,
        default: 'India',
        trim: true
    },
    isDefault: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

const addressBookSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    addresses: {
        type: [addressSchema],
        default: [],
        validate: [arr => arr.length <= 10, 'Maximum 10 addresses allowed']
    }
}, {
    timestamps: true
});

// Index for fast user lookup
addressBookSchema.index({ user: 1 }, { unique: true });

// Add address
addressBookSchema.methods.addAddress = async function (addressData) {
    if (this.addresses.length >= 10) {
        throw new Error('Maximum 10 addresses allowed');
    }

    // If this is the first address or marked as default, set as default
    if (this.addresses.length === 0 || addressData.isDefault) {
        // Remove default from other addresses
        this.addresses.forEach(addr => addr.isDefault = false);
        addressData.isDefault = true;
    }

    this.addresses.push(addressData);
    await this.save();
    return this.addresses[this.addresses.length - 1];
};

// Update address
addressBookSchema.methods.updateAddress = async function (addressId, updates) {
    const address = this.addresses.id(addressId);

    if (!address) {
        throw new Error('Address not found');
    }

    // If setting as default, remove default from others
    if (updates.isDefault) {
        this.addresses.forEach(addr => addr.isDefault = false);
    }

    Object.assign(address, updates);
    await this.save();
    return address;
};

// Remove address
addressBookSchema.methods.removeAddress = async function (addressId) {
    const address = this.addresses.id(addressId);

    if (!address) {
        throw new Error('Address not found');
    }

    const wasDefault = address.isDefault;
    address.deleteOne();

    // If removed address was default, set first remaining as default
    if (wasDefault && this.addresses.length > 0) {
        this.addresses[0].isDefault = true;
    }

    await this.save();
    return this;
};

// Set default address
addressBookSchema.methods.setDefault = async function (addressId) {
    const address = this.addresses.id(addressId);

    if (!address) {
        throw new Error('Address not found');
    }

    this.addresses.forEach(addr => addr.isDefault = false);
    address.isDefault = true;

    await this.save();
    return address;
};

// Get default address
addressBookSchema.methods.getDefault = function () {
    return this.addresses.find(addr => addr.isDefault) || this.addresses[0];
};

// Static: Get or create address book for user
addressBookSchema.statics.getOrCreate = async function (userId) {
    let addressBook = await this.findOne({ user: userId });

    if (!addressBook) {
        addressBook = await this.create({ user: userId, addresses: [] });
    }

    return addressBook;
};

const AddressBook = mongoose.model('AddressBook', addressBookSchema);

export default AddressBook;
