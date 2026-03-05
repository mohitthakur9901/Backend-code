import express from "express"
import {
    DeleteUser,
    ForgotPassword,
    LogOutUser,
    LoginUser,
    RegisterUser,
    UpdateProfilePicture,
    UpdateUserProfile,
    LoginWithGoogle,
    VerifyUser
} from "../controllers/auth.controller"

import { verfiyJWT } from "../middlewares/jwt.middleware"

const router = express.Router()

router.post("/register", RegisterUser)
router.post("/login", LoginUser)
router.post("/google", LoginWithGoogle)
router.post("/verify-user", VerifyUser)

router.use(verfiyJWT)

router.post("/logout", LogOutUser)
router.post("/update-profile", UpdateUserProfile)
router.post("/update-profile-picture", UpdateProfilePicture)
router.post("/forgot-password", ForgotPassword)
router.delete("/delete-user", DeleteUser)

export default router;