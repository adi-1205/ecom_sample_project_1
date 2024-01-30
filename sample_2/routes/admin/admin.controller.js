const path = require('path');
const fs = require('fs');
const Order = require('../../models/order.model');
const Product = require('../../models/product.model');
const User = require('../../models/user.model');
const FlashUserError = require('../../utils/FlashUserError');
const Category = require('../../models/category.model');
const paginator = require('../../helpers/paginator');
const { Op } = require('sequelize');

const getDashboard = async (req, res) => {


    try {
        const userCount = await User.count()
        const productCount = await Product.count()
        const orderCount = await Order.count()

        res.render('admin/dashboard', {
            layout: 'adminMain',
            dashboardPage: true,
            userCount,
            productCount,
            orderCount
        })
    } catch (err) {
        if (err instanceof FlashUserError) {
            return res.status(400).json({ error: err.message })
        }
        console.log(err);
        return res.status(400).json({ error: 'Something went wrong!' })
    }
}

const getProducts = async (req, res) => {

    let { page = 1, filter, val } = req.query
    let queries = {}
    const limit = 20

    let { pg, qrs } = paginator.validatePage(page, limit, queries)
    page = pg
    queries = qrs
    queries.where = {}

    if (filter && filter === 'user') {
        const user = await User.findOne({ where: { email: val } })
        queries.where.userId = user.id
    }
    if (filter && filter === 'product') {
        queries.where.title = {
            [Op.like]: `%${val}%`,
        }
    }

    let { rows: products, count: productsCount } = await Product.findAndCountAll({
        limit,
        ...queries
    })
    products = products.map(p => {
        return {
            ...p.dataValues,
            info: JSON.stringify(p.dataValues)
        }
    })

    let pagination = paginator.paginate(page, productsCount, limit)

    let category = await Category.findAll({ attributes: ['id', ['category', 'name']] })
    category = category.map(c => c.dataValues)
    res.render('admin/products', {
        layout: 'adminMain',
        productPage: true,
        productsCount,
        products,
        noProducts: !productsCount,
        ...pagination,
        category
    })
}

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
                id: id
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
            let imgs = null
            if (product.images) {
                imgs = JSON.parse(product.images);
            }
            let dlt
            if (Array.isArray(imgs) && imgs.length > 0) {
                dlt = [product.thumbnail, ...imgs]
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


const getOrders = async (req, res) => {
    let { page = 1, filter, val } = req.query
    let queries = {}
    let subQueries = {}
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
        queries.where = {}
        if (filter && filter === 'user') {
            const user = await User.findOne({ where: { email: val } })
            
            if (user){
                queries.where.userId = user.id
            }
            else{
                queries.where.userId = 0
            }
        }
        subQueries.where = {}
        if (filter && filter === 'product') {
            subQueries.where.title = {
                [Op.like]: `%${val}%`,
            }
        }
        console.log(await Order.count());

        let { count, rows: orders } = await Order.findAndCountAll({
            attributes: ['createdAt', 'subtotal'],
            include: [{
                model: Product,
                attributes: ['id', 'title', 'price', 'thumbnail'],
                ...subQueries,
                through: {
                    attributes: ['qty']
                }
            }, {
                model: User,
                attributes: ['email']
            }],
            limit,
            ...queries
        })
        let ordersCount = orders.length
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
                subtotal: o.subtotal,
                email: o.user.email
            }
        })

        res.render('admin/orders', {
            layout: 'adminMain',
            orderPage: true,
            orders,
            ...pagination,
            noOrders: ordersCount == 0,
            ordersCount
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
    getDashboard,
    getProducts,
    putProduct,
    deleteProduct,
    getOrders
}