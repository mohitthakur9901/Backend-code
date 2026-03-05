import AsyncHandler from '../utils/AsyncHandler';
import ApiError from '../utils/ApiError';
import ApiResponse from '../utils/ApiResponse';
import { prisma } from '../libs/prisma';
import bcrypt from "bcrypt";
import JWT from "jsonwebtoken";


// logical layer of auth service
const GenerateToken = (userId: number) => {
    try {
        return JWT.sign(
            { id: userId },
            process.env.JWT_SECRET as string,
            { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
        );
    } catch (error) {
        throw new ApiError(500, "Error generating token");
    }
};

const RegisterUser = AsyncHandler(async (req, res, next) => {
    try {
        const { firstName, email, phone, password } = req.body;
        if (!firstName || !email || !phone || !password) {
            throw new ApiError(400, "Required fields are missing");
        }
        const existingUser = await prisma.user.findFirst({
            where: {
                OR: [{ email }, { phone }]
            }
        });
        if (existingUser) {
            throw new ApiError(400, "User already exists");
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
            data: {
                firstName,
                email,
                phone,
                password: hashedPassword
            }
        });
        const token = GenerateToken(user.id);
        const isProduction = process.env.NODE_ENV === "production";
        res.cookie("token", token, {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? "strict" : "lax",
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        return res.status(201).json(
            new ApiResponse(201, { user: { id: user.id, email: user.email, firstName: user.firstName } }, "User registered successfully")
        );
    } catch (error) {
        next(error);
    }
});

const LoginUser = AsyncHandler(async (req, res, next) => {
    try {
        const { email, phone, password } = req.body;

        if (!(email || phone) || !password) {
            throw new ApiError(400, "Email or Phone and password are required");
        }

        const user = await prisma.user.findFirst({
            where: {
                OR: [
                    { email: email || undefined },
                    { phone: phone || undefined }
                ]
            }
        });
        if (!user) {
            throw new ApiError(400, "Invalid credentials");
        }
        if (user.isDeleted) {
            throw new ApiError(400, "Account does not exist");
        }
        const isPasswordValid = await bcrypt.compare(
            password,
            user.password
        );
        if (!isPasswordValid) {
            throw new ApiError(400, "Invalid credentials");
        }
        const token = GenerateToken(user.id);
        const isProduction = process.env.NODE_ENV === "production";
        res.cookie("token", token, {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? "strict" : "lax",
            maxAge: 7 * 24 * 60 * 60 * 1000
        });
        return res.status(200).json(
            new ApiResponse(200, { user: { id: user.id, email: user.email, firstName: user.firstName } }, "Login Successful")
        );
    } catch (error) {
        next(error);
    }
});

const LogOutUser = AsyncHandler(async (req, res, next) => {
    try {
        const isProduction = process.env.NODE_ENV === "production";
        res.clearCookie("token", {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? "strict" : "lax"
        });
        return res.status(200).json(
            new ApiResponse(200, null, "Logged out successfully")
        );
    } catch (error) {
        next(error);
    }
});

const UpdateUserProfile = AsyncHandler(async (req, res) => {
});

const ForgotPassword = AsyncHandler(async (req, res) => {
});

const UpdateProfilePicture = AsyncHandler(async (req, res) => {
});

const DeleteUser = AsyncHandler(async (req, res) => {
});

const VerifyUser = AsyncHandler(async (req, res) => {
});

const LoginWithGoogle = AsyncHandler(async (req, res) => {
});


export {
    RegisterUser,
    LoginUser,
    LogOutUser,
    UpdateUserProfile,
    ForgotPassword,
    UpdateProfilePicture,
    DeleteUser,
    LoginWithGoogle,
    VerifyUser
};