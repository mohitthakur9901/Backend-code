import AsyncHandler from "../utils/AsyncHandler";



const verfiyJWT = AsyncHandler(async (req, res, next) => {
    next();
});

export { verfiyJWT };