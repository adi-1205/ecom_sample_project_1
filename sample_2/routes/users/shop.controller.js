const axios = require('axios');
const fs = require('fs');

const toFlashString = require('../../helpers/notNullObjectContructer');
const Product = require('../../models/product.model');
const path = require('path');
const Category = require('../../models/category.model');
const User = require('../../models/user.model');
const Cart = require('../../models/cart.model');
const CartItem = require('../../models/cartItem.model');
const OrderItem = require('../../models/orderItem.model');
const Order = require('../../models/order.model');
const { Op } = require('sequelize');
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

    let { page = 1, name } = req.query
    let queries = {}
    const limit = 20

    let { pg, qrs } = paginator.validatePage(page, limit, queries)
    page = pg
    queries = qrs

    if (name) {
        queries.where = {
            title: {
                [Op.like]: `%${req.query.name}%`,
            }
        }
    }

    let { rows: result, count: productCount } = await Product.findAndCountAll({
        limit,
        ...queries
    })

    if (!result || !result.length) req.flash('error', 'No products found :(')

    let pagination = paginator.paginate(page, productCount, limit)

    return res.render('products', {
        productPage: true,
        products: result.map(r => r.dataValues),
        error: req.flash('error'),
        ...pagination,
        totalProductCount: productCount,
        showingProducts: result.length
    })

}

const getProduct = async (req, res) => {
    const { id } = req.params;
    const product = await Product.findByPk(id);

    const discount = product.dataValues.discount / 100;
    const originalPrice = Math.floor(product.dataValues.price / (1 - discount));
    res.render('product', {
        productPage: true,
        product: product.dataValues,
        inStock: product.dataValues.stock > 0,
        originalPrice,
        sellerName: req.user.username,
        images: JSON.parse(product.images)
    });
};

const getSellerProfile = async (req, res) => {

    let { page = 1 } = req.query
    let queries = {}
    const limit = 6

    try {

        let { pg, qrs } = paginator.validatePage(page, limit, queries)
        page = pg
        queries = qrs
        console.log(queries);
        let { count: productCount, rows: products } = await Product.findAndCountAll({ where: { userId: req.user.id }, ...queries, limit })

        products = products.map(p => {
            return {
                ...p.dataValues,
                json: JSON.stringify(p.dataValues),
                originalPrice: Math.floor(p.dataValues.price / (1 - p.dataValues.discount / 100))
            }
        })

        let category = await Category.findAll({ attributes: ['id', ['category', 'name']] })
        category = category.map(c => c.dataValues)

        let pagination = paginator.paginate(page, productCount, limit)
        return res.render('sellerProfile', {
            profilePage: true,
            products,
            productsCount: productCount,
            category,
            noProducts: !productCount,
            ...pagination
        })

    } catch (err) {
        console.log(err);
        if (err instanceof FlashUserError) {
            return res.status(400).json({ error: err.message })
        }
        return res.status(500).json({ error: 'Something went wrong!' })
    }
}

const postProduct = async (req, res) => {
    const { title, shortDesc, desc, price, stock, discount, category } = req.body
    let { thumbnail, images } = req.files
    try {

        if (!title || !shortDesc || !desc || !price || !stock || !discount || !category || category === 'Choose...') {
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

        console.log(images.map(i => i.filename));
        const product = await Product.create({
            title,
            shortDesc,
            desc,
            price: +price,
            stock: +stock,
            discount: +discount,
            categoryId: category,
            userId: req.user.id,
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
    const { id, title, shortDesc, desc, price, stock, discount, category } = req.body
    try {

        if (!id || !title || !shortDesc || !desc || !price || !stock || !discount || !category || category === 'Choose...') {
            throw new FlashUserError('Please add all the details')
        }
        let numerics = [price, discount, stock].filter(val => isNaN(+val))
        if (numerics.length > 0) {
            throw new FlashUserError('Price, Discount and Stock should be number')
        }

        const updated = await Product.update({
            title,
            shortDesc,
            desc,
            price: +price,
            stock: +stock,
            discount: +discount,
            categoryId: 1
        }, {
            where: {
                id: id,
                userId: req.user.id
            }
        })

        if (!updated) {
            throw new FlashUserError('Product can not be updated, try after sometime!')
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

const deleteProduct = async (req, res) => {

    const { id } = req.body

    try {

        if (!id) {
            throw new Error('Product id not present')
        }

        const product = await Product.findByPk(id)

        if (product) {
            let imgs = JSON.parse(product.images);
            let dlt
            if (imgs.length > 0) {
                dlt = [product.thumbnail, ...JSON.parse(imgs)]
            } else {
                dlt = [product.thumbnail]
            }

            dlt.forEach(d => {
                const fPath = path.join(__dirname, '..', '..', 'uploads', d)
                if (fs.existsSync(fPath)) {
                    fs.unlinkSync(fPath)
                }
            })

            await Product.destroy({
                where: {
                    id: id
                }
            })
        }
        return res.status(200).json({ message: 'product deleted successfully' })
    } catch (err) {
        if (err instanceof FlashUserError) {
            return res.status(400).json({ error: err.message })
        }
        console.log(err);
        return res.status(500).json({ error: 'Something went wrong!' })
    }
};

const postCart = async (req, res) => {

    const { id: productId, qty } = req.body

    try {

        if (!productId) {
            throw new FlashUserError('Could not add item to cart! invalid cart item')
        }

        if (isNaN(+qty) || +qty === 0) {
            throw new FlashUserError('Quantity must be a NUMBER greater ZERO')
        }

        const existingProduct = await Product.findByPk(productId)

        if (existingProduct) {

            if (existingProduct.stock < +qty) {
                throw new FlashUserError('Quantity out of stock')
            }

            let cart = await req.user.getCart()
            if (!cart) {
                cart = await req.user.createCart()
            }

            if (await cart.countProducts() >= 10) {
                throw new FlashUserError('Cart overloaded, Max 10 items allowed')
            }

            let cartItem = await CartItem.findOne({
                where: {
                    cartId: cart.id,
                    productId: productId
                },
                paranoid: false
            })

            if (cartItem) {
                if (cartItem.deletedAt) {
                    cartItem.restore()
                    cartItem.qty = 0
                }
                cartItem.qty = cartItem.qty + +qty
                cartItem.save()
            } else {
                await CartItem.create({
                    cartId: cart.id,
                    productId: productId,
                    qty: qty
                })
            }

            return res.status(200).json({ message: 'Item added to cart!' })
        } else {
            throw new FlashUserError('Product does not exist!')
        }

    } catch (err) {
        if (err instanceof FlashUserError) {
            return res.status(400).json({ error: err.message })
        }
        console.log(err);
        return res.status(500).json({ error: 'Something went wrong!' })
    }

};

const getCart = async (req, res) => {
    let cartItems = []
    let total = 0

    try {

        const cart = await req.user.getCart()
        if (cart) {
            cartItems = await cart.getProducts({ attributes: ['id', 'title', 'price', 'thumbnail'] })
            cartItems = cartItems.map(c => {
                let itemTotal = c.price * c.cartItem.qty
                total += itemTotal
                return {
                    id: c.id,
                    title: c.title,
                    price: c.price,
                    thumbnail: c.thumbnail,
                    qty: c.cartItem.qty,
                    itemTotal
                }
            })
        }

        return res.render('cart', {
            cartPage: true,
            cartItems,
            total,
            itemCount: cartItems.length,
            noItems: cartItems.length === 0
        })
    }
    catch (err) {
        if (err instanceof FlashUserError) {
            return res.status(400).json({ error: err.message })
        }
        console.log(err);
        return res.status(500).json({ error: 'Something went wrong!' })
    }
}

const deleteCart = async (req, res) => {
    const { id } = req.body

    try {

        if (!id) {
            throw new FlashUserError('Could not delete item from cart! invalid cart item')
        }

        let cart = await req.user.getCart()
        if (cart) {
            await cart.removeProduct(id)
            return res.status(200).json({ message: 'cart item deleted successfully' })
        } else {
            throw new FlashUserError('Could not delete item from cart! invalid cart item')
        }

    } catch (err) {
        if (err instanceof FlashUserError) {
            return res.status(400).json({ error: err.message })
        }
        console.log(err);
        return res.status(500).json({ error: 'Something went wrong!' })
    }
}

const getOrders = async (req, res) => {

    let { page = 1 } = req.query
    let queries = {}
    const limit = 5
    const dateFormatOptions = {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    }
    try {

        let { pg, qrs } = paginator.validatePage(page, limit, queries)
        page = pg
        queries = qrs

        queries.order = [
            ['createdAt', 'desc']
        ]

        let { count: ordersCount, rows: orders } = await Order.findAndCountAll({
            where: {
                userId: req.user.id
            },
            attributes: ['createdAt','subtotal'],
            include: {
                model: Product,
                attributes: ['id', 'title', 'price', 'thumbnail'],
                through: {
                    attributes: ['qty']
                }
            },
            limit,
            ...queries
        })

        let pagination = paginator.paginate(page, ordersCount, limit)

        orders = orders.map(o => {
            return {
                orderOn: o.createdAt.toLocaleDateString('en-US', dateFormatOptions),
                orderItems: o.products.map(p => {
                    let total
                    total = p.price * p.orderItem.qty
                 
                    return {
                        ...p.dataValues,
                        qty: p.orderItem.qty,
                        total
                    }
                }),
                subtotal:o.subtotal
            }
        })

        res.render('orders', {
            orderPage: true,
            orders,
            ...pagination,
            noOrders: ordersCount == 0
        })
    } catch (err) {
        if (err instanceof FlashUserError) {
            return res.status(400).json({ error: err.message })
        }
        console.log(err);
        return res.status(500).json({ error: 'Something went wrong!' })
    }
}

const postOrder = async (req, res) => {
    const { items } = req.body
    let zipped
    let total = 0
    try {

        if (!items || (Array.isArray(items) && !items.length)) {
            throw new FlashUserError('Not items to order!')
        }
        if (items.length > 10) {
            throw new FlashUserError('Max order size should be 10, try removing some items from cart')
        }
        items.forEach(i => {
            if (i.qty < 1 || isNaN(+i.qty)) throw new FlashUserError('Invalid item quantity')
        })

        await sequelize.transaction(async (t) => {
            const order = await req.user.createOrder({ transaction: t })

            const cart = await req.user.getCart({ transaction: t })
            await CartItem.destroy({ where: { cartId: cart.id } }, { transaction: t })

            const products = await Product.findAll({
                where: {
                    id: {
                        [Op.in]: items.map(i => i.id)
                    }
                }
            }, { transaction: t })

            if (items.length === products.length) {
                zipped = items.map(function (e, i) {
                    return [e, products[i]];
                });
                delete products
            } else {
                throw new FlashUserError('Invalid item list')
            }

            for ([item, product] of zipped) {
                if (product.stock == 0) {
                    throw new FlashUserError(`${product.title} out of stock`)
                }
                if (item.qty > product.stock) {
                    throw new FlashUserError(`${product.title} is lacking stock for given quantity`)
                }
                total += product.price * item.qty
                product.stock -= item.qty
                await product.save({ transaction: t })
            }

            let orderItemInfo = items.map(i => {
                return {
                    productId: i.id,
                    orderId: order.id,
                    qty: i.qty
                }
            })
            order.subtotal = total
            await order.save()
            await OrderItem.bulkCreate(orderItemInfo, { transaction: t })

            return res.status(200).json({ message: 'Order placed successfully' })
        })

    } catch (err) {
        if (err instanceof FlashUserError) {
            return res.status(400).json({ error: err.message })
        }
        console.log(err);
        return res.status(500).json({ error: 'Something went wrong!' })
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