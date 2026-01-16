import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { storage } from "./storage";
import { User } from "@shared/schema";

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "r3pl1t_s3cr3t_k3y",
    resave: false,
    saveUninitialized: false,
    store: undefined, // Defaults to MemoryStore (good for MVP, use Redis/DB for prod)
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user || user.password !== password) { // Plaintext for MVP as requested, usually bcrypt
            return done(null, false, { message: "Incorrect username or password." });
        }
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }),
  );

  passport.serializeUser((user, done) => {
    done(null, (user as User).id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  app.post("/api/auth/login", passport.authenticate("local"), async (req, res) => {
    const user = req.user as User;
    await storage.createAuditLog({
      adminId: user.id,
      targetUserId: user.id,
      action: 'LOGIN',
      details: `Usuário ${user.username} realizou login no sistema.`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });
    res.json(req.user);
  });

  app.post("/api/auth/logout", async (req, res, next) => {
    const user = req.user as User;
    if (user) {
      await storage.createAuditLog({
        adminId: user.id,
        targetUserId: user.id,
        action: 'LOGOUT',
        details: `Usuário ${user.username} realizou logout do sistema.`,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });
    }
    req.logout((err) => {
      if (err) return next(err);
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/auth/me", (req, res) => {
    if (req.isAuthenticated()) {
      res.json(req.user);
    } else {
      res.status(401).json({ message: "Unauthorized" });
    }
  });
}
