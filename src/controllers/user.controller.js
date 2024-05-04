import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiReponse.js";

// get user details from frontnend ==>
// validation - not empty ====>
// check if user already exists ? via email or username ====>
// check for images, avatar ===>
// upload images, avatar on cloudinary ===>
// create user object or details and store in db ===>
// remove password and refresh token field from res
// check for user creation
// return res

const registerUser = asyncHandler(async (req, res) => {
    res.status(200).json({
        message: "Ok"
    })
    const { fullName, email, password, username } = req.body;
    console.log("response ===>", response);

    // checking if input field is not empty
    if ([fullName, email, password, username].some((field) => field?.trim() === "")) {
        throw new ApiError(400, "All fields are required")
    }

    // checking if given email or username already exists or not
    const existedUser = User.findOne({
        $or: [{ username }, { email }]
    })
    if (existedUser) {
        throw new ApiError(409, "User with email or username already exists")
    }

    // checking for avatar
    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage[0]?.path;
    if (avatarLocalPath) {
        throw new ApiError(400, "Avatar is required")
    }

    // upload avatar, coverimage on cloudinary

    const avatarUploaded = await uploadOnCloudinary(avatarLocalPath);
    const coverImageUploaded = await uploadOnCloudinary(coverImageLocalPath);
    if (!avatarUploaded) {
        throw new ApiError(400, "Avatar is required")
    }

    // create user object to store in db
    const userDetails = await User.create({
        fullName,
        email,
        password,
        username: username.toLowerCase(),
        avatar: avatarUploaded.url,
        coverImage: coverImage?.url || "",
    })

    // removing password and refresh token field from res
    const createdUser = await User.findById(userDetails._id).select("-password -refreshToken");
    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering a user");
    }

    return res.status(201).json(
        new ApiResponse(200, "User registered successfully", createdUser)
    )

})

export default registerUser;