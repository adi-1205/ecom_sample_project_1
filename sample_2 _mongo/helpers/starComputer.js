module.exports = (rating) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    const halfStar = hasHalfStar ? 1 : 0;
    const emptyStars = 5 - fullStars - halfStar;

    return {
        fullStars: new Array(fullStars).fill(0),
        halfStar: new Array(halfStar).fill(0),
        emptyStars: new Array(emptyStars).fill(0)
    };
}