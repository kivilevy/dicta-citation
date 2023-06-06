export const validateInput = (req, res, next) => {
    const {body: {text, email} } = req;

    if (!minHebrewWords(text))
        return res.status(400).send({message: 'Text must contain at least 3 Hebrew words.'});
    if (!validEmail(email)) 
        return res.status(400).send({message: 'Invalid email format. Please enter a valid email.'});
    next();
}

const validEmail = (email) => {
    const emailRegex = /^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/;
    return emailRegex.test(email);
}

const minHebrewWords = (text) => {
    const hebrewWordRegex = /[\u05D0-\u05EA]+/g;
    const matches = text.match(hebrewWordRegex);
    return matches && matches.length >= 3;
}