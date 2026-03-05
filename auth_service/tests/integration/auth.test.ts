import { describe, it, expect, beforeEach, afterAll } from "vitest";
import request from "supertest";
import bcrypt from "bcrypt";
import app from "../../src/app";
import { prisma } from "../../src/libs/prisma";
import { resetDb } from "../helpers/reset-db";

/* ------------------------------------------------------------------ */
/*  Shared fixtures                                                    */
/* ------------------------------------------------------------------ */
const VALID_USER = {
  firstName: "John",
  email: "john@example.com",
  phone: "1234567890",
  password: "StrongP@ss1",
};

/* ------------------------------------------------------------------ */
/*  Lifecycle                                                          */
/* ------------------------------------------------------------------ */
beforeEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await prisma.$disconnect();
});

/* ================================================================== */
/*  RegisterUser  POST /register                                       */
/* ================================================================== */
describe("POST /register - RegisterUser", () => {
  // ---- Success Path ----
  it("should return 201, set a token cookie, and persist a hashed password", async () => {
    const res = await request(app).post("/register").send(VALID_USER);

    // Status & body
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      statusCode: 201,
      success: true,
      message: "User registered successfully",
    });
    expect(res.body.data.user).toHaveProperty("id");
    expect(res.body.data.user.email).toBe(VALID_USER.email);
    expect(res.body.data.user.firstName).toBe(VALID_USER.firstName);

    // Cookie
    const cookies = res.headers["set-cookie"];
    expect(cookies).toBeDefined();
    const tokenCookie = Array.isArray(cookies)
      ? cookies.find((c: string) => c.startsWith("token="))
      : (cookies as string);
    expect(tokenCookie).toBeDefined();
    expect(tokenCookie).toContain("HttpOnly");

    // Database verification - password must be hashed
    const dbUser = await prisma.user.findUnique({
      where: { email: VALID_USER.email },
    });
    expect(dbUser).not.toBeNull();
    expect(dbUser!.password).not.toBe(VALID_USER.password);
    const passwordMatch = await bcrypt.compare(
      VALID_USER.password,
      dbUser!.password
    );
    expect(passwordMatch).toBe(true);
  });

  // ---- Failure: duplicate email ----
  it("should return 400 when a user with the same email already exists", async () => {
    await request(app).post("/register").send(VALID_USER);

    const res = await request(app).post("/register").send({
      ...VALID_USER,
      phone: "9999999999", // different phone, same email
    });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/already exists/i);
  });

  // ---- Failure: duplicate phone ----
  it("should return 400 when a user with the same phone already exists", async () => {
    await request(app).post("/register").send(VALID_USER);

    const res = await request(app).post("/register").send({
      ...VALID_USER,
      email: "other@example.com", // different email, same phone
    });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/already exists/i);
  });

  // ---- Validation: missing fields ----
  const requiredFields = ["firstName", "email", "phone", "password"] as const;
  for (const field of requiredFields) {
    it(`should return 400 when '${field}' is missing`, async () => {
      const payload = { ...VALID_USER };
      delete (payload as Record<string, unknown>)[field];

      const res = await request(app).post("/register").send(payload);

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/required fields are missing/i);
    });
  }

  it("should return 400 when the body is empty", async () => {
    const res = await request(app).post("/register").send({});
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/required fields are missing/i);
  });
});

/* ================================================================== */
/*  LoginUser  POST /login                                             */
/* ================================================================== */
describe("POST /login - LoginUser", () => {
  // Seed a registered user before each login test
  beforeEach(async () => {
    await request(app).post("/register").send(VALID_USER);
  });

  // ---- Success: login with email ----
  it("should return 200 and set a token cookie when logging in with email", async () => {
    const res = await request(app).post("/login").send({
      email: VALID_USER.email,
      password: VALID_USER.password,
    });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      statusCode: 200,
      success: true,
      message: "Login Successful",
    });
    expect(res.body.data.user.email).toBe(VALID_USER.email);

    const cookies = res.headers["set-cookie"];
    expect(cookies).toBeDefined();
    const tokenCookie = Array.isArray(cookies)
      ? cookies.find((c: string) => c.startsWith("token="))
      : (cookies as string);
    expect(tokenCookie).toBeDefined();
    expect(tokenCookie).toContain("HttpOnly");
  });

  // ---- Success: login with phone ----
  it("should return 200 and set a token cookie when logging in with phone", async () => {
    const res = await request(app).post("/login").send({
      phone: VALID_USER.phone,
      password: VALID_USER.password,
    });

    expect(res.status).toBe(200);
    expect(res.body.data.user.firstName).toBe(VALID_USER.firstName);
  });

  // ---- Failure: wrong password ----
  it("should return 400 for an invalid password", async () => {
    const res = await request(app).post("/login").send({
      email: VALID_USER.email,
      password: "WrongPassword!",
    });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/invalid credentials/i);
  });

  // ---- Failure: non-existent user ----
  it("should return 400 for a non-existent user", async () => {
    const res = await request(app).post("/login").send({
      email: "nobody@example.com",
      password: "DoesNotMatter1!",
    });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/invalid credentials/i);
  });

  // ---- Failure: missing password ----
  it("should return 400 when password is missing", async () => {
    const res = await request(app).post("/login").send({
      email: VALID_USER.email,
    });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/required/i);
  });

  // ---- Failure: missing email and phone ----
  it("should return 400 when both email and phone are missing", async () => {
    const res = await request(app).post("/login").send({
      password: VALID_USER.password,
    });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/required/i);
  });

  // ---- Failure: deleted user ----
  it("should return 400 for a soft-deleted user", async () => {
    await prisma.user.updateMany({
      where: { email: VALID_USER.email },
      data: { isDeleted: true },
    });

    const res = await request(app).post("/login").send({
      email: VALID_USER.email,
      password: VALID_USER.password,
    });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/does not exist/i);
  });
});
