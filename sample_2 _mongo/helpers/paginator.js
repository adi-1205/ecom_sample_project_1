const FlashUserError = require('../utils/FlashUserError');

const validatePage = (page,limit) => {
    if (isNaN(+page)) throw new FlashUserError('Invalid page number')
    page = +(page < 1 ? 1 : page)
    return { pg:page}
}
const paginate = (page, count, limit) => {
    let paginationCount = Math.ceil(count / limit)
    let pagination = Array.from({ length: paginationCount }, (_, i) => {
        return {
            page: i + 1, activePage: page == i + 1
        }
    })
    let prevPage = {
        exists: !!(page - 1),
        page: page - 1
    }
    let nextPage = {
        exists: page < paginationCount,
        page: page + 1
    }

    return { pagination, prevPage, nextPage }
}
module.exports = {
    paginate,
    validatePage
}