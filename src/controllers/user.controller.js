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
// remove password and refresh token field from res ===>
// check for user creation ===>
// return res ===>

const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        user.save({ validateBeforeSave: false });

        return { accessToken, refreshToken }

    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating refresh and access token")
    }

}

const registerUser = asyncHandler(async (req, res) => {
    const { fullName, email, password, username, avatar, coverImage } = req.body;

    // checking if input field is not empty
    if ([fullName, email, password, username].some((field) => field?.trim() === "")) {
        throw new ApiError(400, "All fields are required")
    }

    // checking if given email or username already exists or not
    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })
    if (existedUser) {
        throw new ApiError(409, "User with email or username already exists")
    }

    // checking for avatar
    const avatarLocalPath = req.files?.avatar[0]?.path;
    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }


    if (!avatarLocalPath) {
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
        coverImage: coverImageUploaded?.url || "",
    })

    // removing password and refresh token field from res
    const createdUser = await User.findById(userDetails._id).select("-password -refreshToken");
    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering a user");
    }

    return res.status(201).send(
        new ApiResponse(200, "User registered successfully", createdUser)
    )
});

const loginUser = asyncHandler(async (req, res) => {
    // req.body ==>>>>>>>>
    // username or email ===>
    // find the user ==>
    // password check ===>
    // access and refresh token
    // send cookie

    const { username, password } = req.body;
    console.log("username ==>", username);
    console.log("password ==>", password);

    if (!username || !password) {
        throw new ApiError(400, "username or password must required")
    }

    const existedUser = User.findOne({
        $or: [{ username }, { password }]
    })
    if (!existedUser) {
        throw new ApiError(404, "user with this username is not exist!")
    }

    const isPasswordValid = await existedUser.isPasswordCorrect(password);
    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid user credentials")
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(existedUser._id)

    const loggedInUser = await User.findById(existedUser._id).select("-password -refreshToken");

    const options = {
        httpOnly: true,
        secure: true,
    }

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(200,
                {
                    user: loggedInUser,
                    accessToken,
                    refreshToken
                },
                "User logged in successfully"
            )
        )

})

const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(req.user._id, {
        $set: { refreshToken: undefined }
    },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true,
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
})

export {
    registerUser,
    loginUser,
    logoutUser
}