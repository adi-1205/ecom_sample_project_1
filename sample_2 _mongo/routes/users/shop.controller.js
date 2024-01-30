const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const toFlashString = require('../../helpers/notNullObjectContructer');
const Product = require('../../models/product.model');
const Category = require('../../models/category.model');
const User = require('../../models/user.model');
const Cart = require('../../models/cart.model');
const Order = require('../../models/order.model');
const sequelize = require('../../config/db');
const paginator = require('../../helpers/paginator');
const FlashUserError = require('../../utils/FlashUserError');


const home = (req, res) => {
    console.log(res.locals.cartCount);
    res.render('home', {
        homePage: true,
        cartCount: res.locals.cartCount || 0
    })
}

const getProducts = async (req, res) => {
    try {
        let { page = 1, name } = req.query;
        const limit = 20;
        let { pg } = paginator.validatePage(page, limit);
        page = pg;

        if (name) {
            queries.title = { $regex: new RegExp(name, 'i') };
        }

        const productCount = await Product.countDocuments();

        let result = await Product.find()
            .limit(limit)
            .skip((page - 1) * limit);

        if (!result || result.length === 0) {
            req.flash('error', 'No products found :(');
        }

        result = result.map(r => r.toObject())

        let pagination = paginator.paginate(page, productCount, limit);

        return res.render('products', {
            productPage: true,
            products: result,
            error: req.flash('error'),
            ...pagination,
            totalProductCount: productCount,
            showingProducts: result.length,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).send('Internal Server Error');
    }

}

const getProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const product = await Product.findById(id).lean();

        if (!product) {
            req.flash('error', 'Product not found :(');
            return res.redirect('/products'); // or handle the error in a different way
        }

        const discount = product.discount / 100;
        const originalPrice = Math.floor(product.price / (1 - discount));

        res.render('product', {
            productPage: true,
            product,
            inStock: product.stock > 0,
            originalPrice,
            sellerName: req.user.username,
            images: product.images,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).send('Internal Server Error');
    }
};

const getSellerProfile = async (req, res) => {

    try {
        let { page = 1 } = req.query;
        const limit = 6;

        let { pg } = paginator.validatePage(page, limit);
        page = pg;


        const productCount = await Product.countDocuments({ user: req.user._id });
        const products = await Product.find({ user: req.user._id })
            .limit(limit)
            .skip((page - 1) * limit);

        const mappedProducts = products.map(p => ({
            ...p.toObject(),
            json: JSON.stringify(p.toObject()),
            originalPrice: Math.floor(p.price / (1 - p.discount / 100)),
        }));

        const category = await Category.find({}, { id: 1, category: 1 }).lean();
        const pagination = paginator.paginate(page, productCount, limit);

        return res.render('sellerProfile', {
            profilePage: true,
            products: mappedProducts,
            productsCount: productCount,
            category,
            noProducts: !productCount,
            ...pagination,
        });
    } catch (err) {
        console.log(err);
        if (err instanceof FlashUserError) {
            return res.status(400).json({ error: err.message });
        }
        return res.status(500).json({ error: 'Something went wrong!' });
    }
}

const postProduct = async (req, res) => {
    const { title, shortDesc, desc, price, stock, discount, category } = req.body
    let { thumbnail, images } = req.files
    try {

        if (!title || !shortDesc || !desc || !price || !stock || !discount || !category || category === 'Choose...') {
            console.log({ title, shortDesc, desc, price, stock, discount, category });
            throw new FlashUserError('Please add all the details')
        }
        if (!thumbnail) {
            throw new FlashUserError('Please provid product thumbnail')
        }
        if (!images) {
            images = []
        }
        let numerics = [price, discount, stock].filter(val => isNaN(+val))
        if (numerics.length > 0) {
            throw new FlashUserError('Price, Discount and Stock should be number')
        }

        const product = await Product.create({
            title,
            shortDesc,
            desc,
            price: +price,
            stock: +stock,
            discount: +discount,
            category: category,
            user: req.user._id,
            thumbnail: thumbnail[0].filename,
            images: images.map(i => i.filename)
        })

        if (!product) {
            throw new FlashUserError('Product can not be added, try after sometime!')
        }

        return res.status(200).json({ message: 'product added successfully' })

    } catch (err) {
        if (err instanceof FlashUserError) {
            return res.status(400).json({ error: err.message })
        }
        console.log(err);
        return res.status(500).json({ error: 'Something went wrong!' })
    }
};

const putProduct = async (req, res) => {
    try {
        const { id, title, shortDesc, desc, price, stock, discount, category } = req.body;

        if (!id || !title || !shortDesc || !desc || !price || !stock || !discount || !category || category === 'Choose...') {
            throw new FlashUserError('Please add all the details');
        }

        const numerics = [price, discount, stock].filter(val => isNaN(+val));
        if (numerics.length > 0) {
            throw new FlashUserError('Price, Discount, and Stock should be a number');
        }

        const updated = await Product.findOneAndUpdate(
            { _id: id, user: req.user._id }, // Ensure the product belongs to the current user
            {
                title,
                shortDesc,
                desc,
                price: +price,
                stock: +stock,
                discount: +discount,
                category: category,
            },
            { new: true }
        );

        if (!updated) {
            throw new FlashUserError('Product cannot be updated, try after some time!');
        }

        return res.status(200).json({ message: 'Product updated successfully' });
    } catch (err) {
        if (err instanceof FlashUserError) {
            return res.status(400).json({ error: err.message });
        }
        console.log(err);
        return res.status(500).json({ error: 'Something went wrong!' });
    }
};

const deleteProduct = async (req, res) => {
    try {
        const { id } = req.body;

        if (!id) {
            throw new Error('Product id not present');
        }

        const product = await Product.findById(id);

        if (product) {
            let imgs = product.images;
            let dlt;
            if (imgs.length > 0) {
                dlt = [product.thumbnail, ...imgs];
            } else {
                dlt = [product.thumbnail];
            }

            for (const d of dlt) {
                const fPath = path.join(__dirname, '..', '..', 'uploads', d);
                try {
                    fs.unlinkSync(fPath);
                } catch (error) {
                    console.error('Error deleting file:', error);
                }
            }

            await Product.deleteOne({
                _id: id,
                user: req.user._id,
            });
        }

        return res.status(200).json({ message: 'Product deleted successfully' });
    } catch (err) {
        if (err instanceof FlashUserError) {
            return res.status(400).json({ error: err.message });
        }
        console.log(err);
        return res.status(500).json({ error: 'Something went wrong!' });
    }
};

const postCart = async (req, res) => {
    try {
        const { id: productId, qty } = req.body;
        console.log(productId);
        if (!productId) {
            throw new FlashUserError('Could not add item to cart! Invalid cart item');
        }

        if (isNaN(+qty) || +qty === 0) {
            throw new FlashUserError('Quantity must be a NUMBER greater than ZERO');
        }

        const existingProduct = await Product.findById(productId);

        if (existingProduct) {
            if (existingProduct.stock < +qty) {
                throw new FlashUserError('Quantity out of stock');
            }

            let user = await User.findById(req.user._id);
            let cart = await Cart.findOne({ user: user._id });

            if (!cart) {
                cart = await Cart.create({ user: user._id, items: [] });
            }

            if (cart.items.length >= 10) {
                throw new FlashUserError('Cart overloaded, Max 10 items allowed');
            }

            const cartItemIndex = cart.items.findIndex(item => item.product.equals(productId));

            if (cartItemIndex !== -1) {
                cart.items[cartItemIndex].qty += +qty;
            } else {
                cart.items.push({ product: productId, qty: +qty });
            }

            await cart.save();

            return res.status(200).json({ message: 'Item added to cart!' });
        } else {
            throw new FlashUserError('Product does not exist!');
        }
    } catch (err) {
        if (err instanceof FlashUserError) {
            return res.status(400).json({ error: err.message });
        }
        console.log(err);
        return res.status(500).json({ error: 'Something went wrong!' });
    }

};

const getCart = async (req, res) => {
    let cartItems = [];
    let total = 0;

    try {
        const user = await User.findById(req.user._id);
        const cart = await Cart.findOne({ user: user._id });

        if (cart) {
            const cartItemsData = await Product.find({
                _id: { $in: cart.items.map(item => item.product) },
            });

            if (!cartItemsData.length) {
                cart.items = []
                cart.save()
            }

            cartItems = cartItemsData.map(c => {
                const cartItem = cart.items.find(item => item.product.equals(c._id));
                let itemTotal = c.price * cartItem.qty;
                total += itemTotal;

                return {
                    id: c.id,
                    title: c.title,
                    price: c.price,
                    thumbnail: c.thumbnail,
                    qty: cartItem.qty,
                    itemTotal,
                };
            });
        }

        return res.render('cart', {
            cartPage: true,
            cartItems,
            total,
            itemCount: cartItems.length,
            noItems: cartItems.length === 0,
        });
    } catch (err) {
        if (err instanceof FlashUserError) {
            return res.status(400).json({ error: err.message });
        }
        console.log(err);
        return res.status(500).json({ error: 'Something went wrong!' });
    }
}

const deleteCart = async (req, res) => {
    const { id } = req.body;

    try {
        if (!id) {
            throw new FlashUserError('Could not delete item from cart! Invalid cart item');
        }

        let user = await User.findById(req.user._id);
        let cart = await Cart.findOne({ user: user._id });

        if (cart) {
            const index = cart.items.findIndex(item => item.product.equals(id));

            if (index !== -1) {
                cart.items.splice(index, 1);
                await cart.save();
            }
            return res.status(200).json({ message: 'Cart item deleted successfully' });
        } else {
            throw new FlashUserError('Could not delete item from cart! Invalid cart item');
        }
    } catch (err) {
        if (err instanceof FlashUserError) {
            return res.status(400).json({ error: err.message });
        }
        console.log(err);
        return res.status(500).json({ error: 'Something went wrong!' });
    }
}

const getOrders = async (req, res) => {
    const { page = 1 } = req.query;
    const limit = 5;
    const dateFormatOptions = {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    };

    try {
        const orders = await Order.find({ user: req.user._id })
            .sort({ createdAt: 'desc' })
            .skip((page - 1) * limit)
            .limit(limit)
            .populate({
                path: 'orderItems.product',
                select: 'id title price thumbnail',
            });

        const ordersCount = await Order.countDocuments({ user: req.user._id });

        const pagination = {
            page,
            pageCount: Math.ceil(ordersCount / limit),
        };

        const formattedOrders = orders.map(order => ({
            orderOn: order.createdAt.toLocaleDateString('en-US', dateFormatOptions),
            orderItems: order.orderItems.map((orderItem) => {
                let ob = {}
                if (orderItem.product) {
                    ob = { ...orderItem.product._doc }
                }
                return {
                    ...ob,
                    qty: orderItem.qty,
                    total: orderItem.total,
                }
            }),
            subtotal: order.subtotal,
        }));

        console.log(formattedOrders);

        res.render('orders', {
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

const postOrder = async (req, res) => {
    const { items } = req.body;
    let total = 0;

    try {
        if (!items || (Array.isArray(items) && !items.length)) {
            throw new FlashUserError('No items to order!');
        }

        if (items.length > 10) {
            throw new FlashUserError('Max order size should be 10, try removing some items from the cart');
        }

        items.forEach(item => {
            if (item.qty < 1 || isNaN(+item.qty)) {
                throw new FlashUserError('Invalid item quantity');
            }
        });

        const user = await User.findById(req.user._id);
        const orderItemsInfo = [];

        for (const item of items) {
            const product = await Product.findById(item.id);

            if (!product || product.stock === 0 || item.qty > product.stock) {
                throw new FlashUserError(`Invalid item:`);
            }

            total += product.price * item.qty;
            product.stock -= item.qty;
            await product.save();

            orderItemsInfo.push({
                product: item.id,
                qty: item.qty,
                total
            });
        }

        const order = new Order({
            user: user._id,
            subtotal: total,
            orderItems: orderItemsInfo,
        });

        await order.save();

        const cart = await Cart.findOne({ user: req.user._id })
        cart.items = []
        await cart.save()

        res.status(200).json({ message: 'Order placed successfully' });
    } catch (err) {
        if (err instanceof FlashUserError) {
            return res.status(400).json({ error: err.message });
        }
        console.error(err);
        return res.status(500).json({ error: 'Something went wrong!' });
    }
}

module.exports = {
    home,
    getProducts,
    getProduct,
    getSellerProfile,
    postProduct,
    putProduct,
    deleteProduct,
    postCart,
    getCart,
    deleteCart,
    getOrders,
    postOrder
}



// const getAddProduct = async (req, res) => {

//     let category = await Category.findAll({ attributes: ['id', ['category', 'name']] })
//     category = category.map(c => c.dataValues)

//     let filledData = req.flash('filledData')
//     filledData = filledData.length !== 0 ? filledData : '[]'
//     return res.render('add-product', {
//         success: req.flash('success'),
//         error: req.flash('error'),
//         filledData: JSON.parse(filledData),
//         category
//     })
// }

// const postAddProduct = async (req, res) => {

//     const { title, shortDesc, desc, price, stock, discount, category } = req.body
//     const { thumbnail, images } = req.files

//     try {

//         if (!title || !shortDesc || !desc || !price || !stock || !discount || !category || category === 'Choose...') {
//             throw new FlashUserError('Please add all the details')
//         }
//         if (!thumbnail) {
//             throw new FlashUserError('Please provid product thumbnail')
//         }
//         let numerics = [price, discount, stock].filter(val => isNaN(+val))
//         if (numerics.length > 0) {
//             throw new FlashUserError('Price, Discount and Stock should be number')
//         }


//         const product = await Product.create({
//             title,
//             shortDesc,
//             desc,
//             price: +price,
//             stock: +stock,
//             discount: +discount,
//             categoryId: category,
//             userId: req.user.id,
//             thumbnail: thumbnail[0].filename,
//             images: images ? JSON.stringify(images.map(img => img.filename)) : "[]"
//         })

//         if (!product) {
//             throw new FlashUserError('Product can not be added, try after sometime!')
//         }

//         req.flash('success', 'product added successfully!')
//         return res.redirect('/seller-profile')

//     } catch (err) {
//         if (err instanceof FlashUserError) {
//             req.flash('error', err.message)
//             req.flash('filledData', toFlashString({ title, shortDesc, desc, price, stock, discount, category }))
//             return res.redirect('/add-product')
//         }
//         console.log(err)
//         return res.sendStatus(500)
//     }
// }

// const getUpdateProduct = async (req, res) => {

//     const { id } = req.params

//     let category = await Category.findAll({ attributes: ['id', ['category', 'name']] })
//     category = category.map(c => c.dataValues)

//     let product = await Product.findOne({
//         where: {
//             id: id,
//             userId: req.user.id
//         }
//     })
//     product = product.dataValues

//     let filledData = req.flash('filledData')
//     filledData = filledData.length !== 0 ? filledData : JSON.stringify(product)

//     return res.render('update-product', {
//         success: req.flash('success'),
//         error: req.flash('error'),
//         filledData: JSON.parse(filledData),
//         category,
//     })
// }

// const postUpdateProduct = async (req, res) => {
//     console.log('reaching update');
//     const { id, title, shortDesc, desc, price, stock, discount, category } = req.body
//     try {

//         if (!id || !title || !shortDesc || !desc || !price || !stock || !discount || !category || category === 'Choose...') {
//             throw new FlashUserError('Please add all the details')
//         }
//         let numerics = [price, discount, stock].filter(val => isNaN(+val))
//         if (numerics.length > 0) {
//             throw new FlashUserError('Price, Discount and Stock should be number')
//         }

//         const updated = await Product.update({
//             title,
//             shortDesc,
//             desc,
//             price: +price,
//             stock: +stock,
//             discount: +discount,
//             categoryId: 1,
//             userId: req.user.id
//         }, {
//             where: {
//                 id: id,
//                 userId: req.user.id
//             }
//         })

//         if (!updated) {
//             throw new FlashUserError('Product can not be updated, try after sometime!')
//         }

//         req.flash('success', 'product updated successfully!')
//         return res.redirect('/seller-profile')

//     } catch (err) {
//         if (err instanceof FlashUserError) {
//             req.flash('error', err.message)
//             req.flash('updateData', toFlashString({ title, shortDesc, desc, price, stock, discount, category }))
//             return res.redirect('/seller-profile')
//         }
//         console.log(err)
//         return res.sendStatus(500)
//     }
// }

// const getDeleteProduct = async (req, res) => {
//     const { id } = req.params

//     try {

//         if (!id) {
//             throw new Error('Product id not present')
//         }

//         const product = await Product.findByPk(id)

//         if (product) {
//             let imgs = JSON.parse(product.images);
//             let dlt
//             if (imgs.length > 0) {
//                 dlt = [product.thumbnail, ...JSON.parse(imgs)]
//             } else {
//                 dlt = [product.thumbnail]
//             }

//             dlt.forEach(d => {
//                 const fPath = path.join(__dirname, '..', '..', 'uploads', d)
//                 if (fs.existsSync(fPath)) {
//                     fs.unlinkSync(fPath)
//                 }
//             })

//             await Product.destroy({
//                 where: {
//                     id: id,
//                     userId: req.user.id
//                 }
//             })
//         }
//         return res.redirect('/seller-profile')
//     } catch (err) {
//         console.log(err);
//         return res.sendStatus(500)
//     }
// }


// const getAddToCart = async (req, res) => {
//     const { pid } = req.params

//     try {

//         return res.redirect('/product' + pid)

//     } catch (err) {
//         console.log(err);
//         res.redirect(`/product/${pid}`)
//     }

// }











// const getSellerProfile = async (req, res) => {

//     let filledData = req.flash('filledData')
//     filledData = filledData.length !== 0 ? filledData : '[]'
//     let updateData = req.flash('updateData')
//     updateData = updateData.length !== 0 ? updateData : '[]'


//     let { stock, ctgry } = req.query
//     let productList = []
//     if (ctgry != 0) {
//         if (stock == 'instock') {
//             productList = await req.user.getProducts({
//                 where: {
//                     stock: {
//                         [Op.gt]: 0
//                     },
//                     categoryId: ctgry
//                 }
//             })
//         }
//         if (stock == 'outstock') {
//             productList = await req.user.getProducts({
//                 where: {
//                     stock: {
//                         [Op.gt]: 0
//                     },
//                     categoryId: ctgry
//                 }
//             })
//         }
//         if (stock == 0) {
//             productList = await req.user.getProducts({
//                 where: {
//                     categoryId: ctgry
//                 }
//             })
//         }
//     }
//     if (ctgry == 0) {
//         if (stock == 'instock') {
//             productList = await req.user.getProducts({
//                 where: {
//                     stock: {
//                         [Op.gt]: 0
//                     }
//                 }
//             })
//         }
//         if (stock == 'outstock') {
//             productList = await req.user.getProducts({
//                 where: {
//                     stock: {
//                         [Op.lte]: 0
//                     }
//                 }
//             })
//         }
//     }

//     if (!stock || !ctgry) {
//         productList = await req.user.getProducts()
//     }


//     const products = productList.map(product => {
//         return {
//             ...product.dataValues,
//             data: JSON.stringify(product.dataValues),
//             originalPrice: Math.floor(product.price / (1 - product.discount / 100))
//         }
//     })

//     const categoryList = await Category.findAll({ attributes: ['id', 'category'] })
//     const category = categoryList.map(c => {
//         return {
//             id: c.id,
//             name: c.category
//         }
//     })

//     res.render('seller-profile', {
//         isAuthenticated: req.isAuthenticated(),
//         profilePage: true,
//         error: req.flash('error'),
//         success: req.flash('success'),
//         filledData: JSON.parse(filledData),
//         openModel: req.flash('openModel') == 'true',
//         products,
//         updateData: JSON.parse(updateData),
//         openUpdateModel: req.flash('openUpdateModel') == 'true',
//         nofill: req.flash('nofill') == 'true',
//         productsCount: products.length,
//         category
//     })

//     delete category
//     delete categoryList
//     delete products
//     delete productList
// }

// const postSellerProfile = async (req, res) => {
//     const { title, shortDesc, desc, price, stock, discount, category } = req.body
//     const { thumbnail, images } = req.files

//     try {

//         if (!title || !shortDesc || !desc || !price || !stock || !discount || !category || category === 'Choose...') {
//             throw new FlashUserError('Please add all the details')
//         }
//         if (!thumbnail) {
//             throw new FlashUserError('Please provid product thumbnail')
//         }
//         let numerics = [price, discount, stock].filter(val => isNaN(+val))
//         if (numerics.length > 0) {
//             throw new FlashUserError('Price, Discount and Stock should be number')
//         }


//         const product = await Product.create({
//             title,
//             shortDesc,
//             desc,
//             price: +price,
//             stock: +stock,
//             discount: +discount,
//             categoryId: category,
//             userId: req.user.id,
//             thumbnail: thumbnail[0].filename,
//             images: images ? JSON.stringify(images.map(img => img.filename)) : "[]"
//         })

//         if (!product) {
//             throw new FlashUserError('Product can not be added, try after sometime!')
//         }

//         req.flash('success', 'product added successfully!')
//         req.flash('openModel', 'true')
//         return res.redirect('/seller-profile')

//     } catch (err) {
//         if (err instanceof FlashUserError) {
//             req.flash('error', err.message)
//             req.flash('openModel', 'true')
//             req.flash('filledData', toFlashString({ title, shortDesc, desc, price, stock, discount, category }))
//             return res.redirect('/seller-profile')
//         }
//         console.log(err)
//         return res.sendStatus(500)
//     }
// }

// const postUpdateProduct = async (req, res) => {
//     const { id, title, shortDesc, desc, price, stock, discount, category } = req.body
//     console.log({ id, title, shortDesc, desc, price, stock, discount, category });
//     try {

//         if (!id || !title || !shortDesc || !desc || !price || !stock || !discount || !category || category === 'Choose...') {
//             throw new FlashUserError('Please add all the details')
//         }
//         let numerics = [price, discount, stock].filter(val => isNaN(+val))
//         if (numerics.length > 0) {
//             throw new FlashUserError('Price, Discount and Stock should be number')
//         }

//         const updated = await Product.update({
//             title,
//             shortDesc,
//             desc,
//             price: +price,
//             stock: +stock,
//             discount: +discount,
//             categoryId: 1,
//             userId: req.user.id
//         }, {
//             where: {
//                 id: id,
//                 userId: req.user.id
//             }
//         })

//         if (!updated) {
//             throw new FlashUserError('Product can not be updated, try after sometime!')
//         }

//         req.flash('success', 'product updated successfully!')
//         req.flash('openUpdateModel', 'true')
//         return res.redirect('/seller-profile')

//     } catch (err) {
//         if (err instanceof FlashUserError) {
//             req.flash('error', err.message)
//             req.flash('openUpdateModel', 'true')
//             req.flash('nofill', 'true')
//             req.flash('updateData', toFlashString({ id, title, shortDesc, desc, price, stock, discount, category }))
//             return res.redirect('/seller-profile')
//         }
//         console.log(err)
//         return res.sendStatus(500)
//     }

// }