const path = require('path');
const fs = require('fs');
const Order = require('../../models/order.model');
const Product = require('../../models/product.model');
const User = require('../../models/user.model');
const FlashUserError = require('../../utils/FlashUserError');
const Category = require('../../models/category.model');
const paginator = require('../../helpers/paginator');

const getDashboard = async (req, res) => {

    try {
        const userCount = await User.countDocuments();
        const productCount = await Product.countDocuments();
        const orderCount = await Order.countDocuments();

        res.render('admin/dashboard', {
            layout: 'adminMain',
            dashboardPage: true,
            userCount,
            productCount,
            orderCount
        });
    } catch (err) {
        if (err instanceof FlashUserError) {
            return res.status(400).json({ error: err.message });
        }
        console.error(err);
        return res.status(500).json({ error: 'Something went wrong!' });
    }
}

const getProducts = async (req, res) => {
    let { page = 1, filter, val } = req.query;
    let queries = {}
    const limit = 20;

    let { pg } = paginator.validatePage(page, limit);
    page = pg

    if (filter && filter === 'user') {
        const user = await User.findOne({ email: val });
        queries.userId = user._id;
    }
    if (filter && filter === 'product') {
        queries.title = new RegExp(val, 'i');
    }

    try {
        const productsCount = await Product.countDocuments(queries);
        const products = await Product.find(queries)
            .limit(limit)
            .skip((page - 1) * limit);

        const category = await Category.find({}, { category: 1, _id: 1 }).lean();

        const mappedProducts = products.map(p => ({
            ...p.toObject(),
            info: JSON.stringify(p.toObject())
        }));

        const pagination = paginator.paginate(page, productsCount, limit);

        res.render('admin/products', {
            layout: 'adminMain',
            productPage: true,
            productsCount,
            products: mappedProducts,
            noProducts: !productsCount,
            ...pagination,
            category
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Something went wrong!' });
    }
}
const putProduct = async (req, res) => {
    const { id, title, shortDesc, desc, price, stock, discount, category } = req.body;

    try {
        if (!id || !title || !shortDesc || !desc || !price || !stock || !discount || !category || category === 'Choose...') {
            throw new FlashUserError('Please add all the details');
        }

        const numerics = [price, discount, stock].filter(val => isNaN(+val));
        if (numerics.length > 0) {
            throw new FlashUserError('Price, Discount, and Stock should be numbers');
        }
        const updatedProduct = await Product.findByIdAndUpdate(
            id,
            {
                title,
                shortDesc,
                desc,
                price: +price,
                stock: +stock,
                discount: +discount,
                category
            },
            { new: true }
        );

        if (!updatedProduct) {
            throw new FlashUserError('Product could not be updated, try again later!');
        }

        return res.status(200).json({ message: 'Product updated successfully' });
    } catch (err) {
        if (err instanceof FlashUserError) {
            return res.status(400).json({ error: err.message });
        }
        console.error(err);
        return res.status(500).json({ error: 'Something went wrong!' });
    }
};

const deleteProduct = async (req, res) => {
    const { id } = req.body;

    try {
        if (!id) {
            throw new Error('Product id not present');
        }

        const product = await Product.findById(id);

        if (product) {
            let dlt;
            if (product.images.length > 0) {
                dlt = [product.thumbnail, ...product.images];
            } else {
                dlt = [product.thumbnail];
            }

            dlt.forEach(d => {
                const fPath = path.join(__dirname, '..', '..', 'uploads', d);
                if (fs.existsSync(fPath)) {
                    fs.unlinkSync(fPath);
                }
            });

            await product.deleteOne();
        }

        return res.status(200).json({ message: 'Product deleted successfully' });
    } catch (err) {
        if (err instanceof FlashUserError) {
            return res.status(400).json({ error: err.message });
        }
        console.error(err);
        return res.status(500).json({ error: 'Something went wrong!' });
    }
};


const getOrders = async (req, res) => {
    const { page = 1, val, filter } = req.query;
    const queries = {}
    const limit = 5;
    const dateFormatOptions = {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    };

    if (filter === 'user') {
        let user = await User.findOne({ email: val })
        queries['user'] = user._id
    }

    try {
        const orders = await Order.find({ ...queries })
            .sort({ createdAt: 'desc' })
            .skip((page - 1) * limit)
            .limit(limit)
            .populate({
                path: 'user',
                select: 'email',
            })
            .populate({
                path: 'orderItems.product',
                select: 'id title price thumbnail',
            });

        let ordersCount = await orders.length

        const pagination = {
            page,
            pageCount: Math.ceil(ordersCount / limit),
        };

        const formattedOrders = orders.map(order => {
            let ob = {
                orderItems: order.orderItems.map((orderItem) => {
                    let ob = {}
                    if (orderItem.product) {
                        ob = { ...orderItem.product._doc }
                        return {
                            ...ob,
                            qty: orderItem.qty,
                            total: orderItem.total,
                        }
                    }
                }),
                orderOn: order.createdAt.toLocaleDateString('en-US', dateFormatOptions),
                subtotal: order.subtotal,
                email: order.user.email
            }
            return ob

        });



        res.render('admin/orders', {
            layout: 'adminMain',
            orderPage: true,
            orders: formattedOrders,
            ...pagination,
            noOrders: ordersCount === 0,
        });
    } catch (err) {
        if (err instanceof FlashUserError) {
            return res.status(400).json({ error: err.message });
        }
        console.log(err);
        return res.status(500).json({ error: 'Something went wrong!' });
    }
}

module.exports = {
    getDashboard,
    getProducts,
    putProduct,
    deleteProduct,
    getOrders
}