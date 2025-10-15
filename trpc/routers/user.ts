import { initTRPC } from "@trpc/server";
import { z } from "zod";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { dbConnect } from "../../models/dbconnect";
import { User } from "../../models/user";

const t = initTRPC.create();

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret"; // Replace with a secure one in prod

export const userRouter = t.router({
  register: t.procedure
    .input(
      z.object({
        name: z.string(),
        email: z.email(),
        password: z.string().min(6),
        confirmPassword: z.string().min(6),
        addresses: z.array(
          z.object({
            type: z.string(),
            street: z.string(),
            city: z.string(),
            state: z.string(),
            zipCode: z.string(),
            country: z.string(),
            phone: z.string().optional(),
          })
        ),
        documents: z.object({
          aadhar: z.string(),
          pan: z.string(), 
          // panOrAadhar: z.string().optional(), // base64 or URL or filename
          gstin: z.string().optional(),
        })
      })
    )
    .mutation(async ({ input }) => {
      await dbConnect();

      if (input.password !== input.confirmPassword) {
        throw new Error("Passwords do not match");
      }

      const existingUser = await User.findOne({ email: input.email });
      if (existingUser) {
        throw new Error("Email already in use");
      }

      const hashedPassword = await bcrypt.hash(input.password, 10);

      const newUser = await User.create({
        name: input.name,
        email: input.email,
        password: hashedPassword,
        addresses: input.addresses,
        documents: input.documents,
        orders: [],
        order: [],
      });

      return {
        success: true,
        message: "User registered successfully",
        userId: newUser._id,
      };
    }),

  login: t.procedure
    .input(
      z.object({
        email: z.email(),
        password: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      await dbConnect();
      const user = await User.findOne({ email: input.email });
      if (!user) {
        throw new Error("Invalid email or password");
      }

      const isValid = await bcrypt.compare(input.password, user.password);
      if (!isValid) {
        throw new Error("Invalid email or password");
      }

      const token = jwt.sign(
        { userId: user._id, email: user.email },
        JWT_SECRET,
        { expiresIn: "7d" }
      );
      console.log("User logged in:", user.documents);
      return {
        success: true,
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
        },
      };
    }),

  getCurrentUser: t.procedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      try {
        const decoded = jwt.verify(input.token, JWT_SECRET) as { userId: string };
        await dbConnect();
        const user = await User.findById(decoded.userId);

        if (!user) throw new Error("User not found");
        
        return {
          id: user._id,
          name: user.name,
          email: user.email,
          addresses: user.addresses,
          orders: user.orders,
          documents: user.documents,

          
        };
      } catch (err) {
        throw new Error("Invalid or expired token", err as Error);
      }
    }),
});
