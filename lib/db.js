import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import UserMongoose from "@/models/User";
import MessageMongoose from "@/models/Message";
import GroupMongoose from "@/models/Group";

let isConnected = false;
let useFallback = false;

export const connectDB = async () => {
  if (isConnected || useFallback) return;
  try {
    let uri = process.env.MONGODB_URI;
    if (!uri || uri === "your_mongodb_uri") {
      console.log("No MONGODB_URI configured. Falling back to local JSON database immediately.");
      useFallback = true;
      return;
    }

    mongoose.set("bufferCommands", false);

    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 2000,
    });
    isConnected = true;
    console.log("MongoDB Connected to:", uri);
  } catch (error) {
    console.warn("MongoDB connection failed. Falling back to local JSON database.");
    useFallback = true;
  }
};

// --- Local JSON DB Helper functions ---
const DB_FILE = path.join(process.cwd(), "local_db.json");

const readDB = () => {
  if (!fs.existsSync(DB_FILE)) {
    return { users: [], messages: [] };
  }
  try {
    const data = fs.readFileSync(DB_FILE, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    return { users: [], messages: [] };
  }
};

const writeDB = (data) => {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to write to local JSON DB file:", err);
  }
};

// --- Advanced QueryThenable Class for fully chainable queries ---
class QueryThenable {
  constructor(executeFn) {
    this.executeFn = executeFn;
    this.modifiers = [];
  }

  select(fieldsString) {
    this.modifiers.push((result) => {
      if (!result) return result;
      
      const applySelect = (item) => {
        if (typeof item !== "object" || item === null) return item;
        let copy;
        if (typeof item.toObject === "function") {
          copy = item.toObject();
        } else {
          copy = { ...item };
        }
        
        const fields = fieldsString.split(/\s+/).filter(Boolean);
        const isExcluding = fields.every(f => f.startsWith("-"));
        
        if (isExcluding) {
          // Remove password or other excluded fields
          fields.forEach(f => {
            const cleanField = f.substring(1);
            delete copy[cleanField];
          });
        } else if (fields.length > 0) {
          // Select only designated fields
          const selected = {};
          fields.forEach(f => {
            selected[f] = copy[f];
          });
          // Preserve _id usually
          if (copy._id && !fields.includes("_id")) {
            selected._id = copy._id;
          }
          return selected;
        }
        return copy;
      };

      if (Array.isArray(result)) {
        return result.map(applySelect);
      }
      return applySelect(result);
    });
    return this;
  }

  sort(sortQuery) {
    this.modifiers.push((result) => {
      if (!Array.isArray(result)) return result;
      // In the mock database, messages are already inserted in chronological order
      // which is exactly what we need, so we just return the result.
      return result;
    });
    return this;
  }

  // Automatically invoked by JS engine when the object is awaited!
  async then(onResolve, onReject) {
    try {
      await connectDB();
      let result = await this.executeFn();
      for (const modifier of this.modifiers) {
        result = modifier(result);
      }
      return onResolve(result);
    } catch (err) {
      if (onReject) return onReject(err);
      throw err;
    }
  }
}

// --- Wrapped Models using the QueryThenable pattern ---

export const User = {
  findOne: (query) => {
    return new QueryThenable(async () => {
      if (!useFallback) {
        try {
          return await UserMongoose.findOne(query);
        } catch (err) {
          useFallback = true;
        }
      }
      const dbData = readDB();
      const user = dbData.users.find((u) => {
        return Object.entries(query).every(([key, val]) => u[key] === val);
      });
      return user || null;
    });
  },

  findById: (id) => {
    return new QueryThenable(async () => {
      if (!useFallback) {
        try {
          return await UserMongoose.findById(id);
        } catch (err) {
          useFallback = true;
        }
      }
      const dbData = readDB();
      const idStr = id?.toString();
      const user = dbData.users.find((u) => u._id === idStr);
      return user || null;
    });
  },

  create: async (userData) => {
    await connectDB();
    if (!useFallback) {
      try {
        return await UserMongoose.create(userData);
      } catch (err) {
        useFallback = true;
      }
    }
    const dbData = readDB();
    const newUser = {
      ...userData,
      _id: Math.random().toString(36).substring(2, 15),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    dbData.users.push(newUser);
    writeDB(dbData);
    return newUser;
  },

  find: (query) => {
    return new QueryThenable(async () => {
      if (!useFallback) {
        try {
          return await UserMongoose.find(query);
        } catch (err) {
          useFallback = true;
        }
      }
      const dbData = readDB();
      let filtered = dbData.users;
      if (query) {
        filtered = dbData.users.filter((u) => {
          return Object.entries(query).every(([key, val]) => {
            if (val && typeof val === "object" && "$ne" in val) {
              return u[key] !== val.$ne;
            }
            return u[key] === val;
          });
        });
      }
      return filtered;
    });
  },
};

export const Message = {
  create: async (msgData) => {
    await connectDB();
    if (!useFallback) {
      try {
        return await MessageMongoose.create(msgData);
      } catch (err) {
        useFallback = true;
      }
    }
    const dbData = readDB();
    const newMsg = {
      ...msgData,
      _id: Math.random().toString(36).substring(2, 15),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    dbData.messages.push(newMsg);
    writeDB(dbData);
    return newMsg;
  },

  find: (query) => {
    return new QueryThenable(async () => {
      if (!useFallback) {
        try {
          return await MessageMongoose.find(query);
        } catch (err) {
          useFallback = true;
        }
      }
      const dbData = readDB();
      const filtered = dbData.messages.filter((m) => {
        if (query && query.groupId) {
          return m.groupId === query.groupId;
        }
        if (query && query.$or) {
          return query.$or.some((q) => {
            return (
              (q.sender === m.sender && q.receiver === m.receiver) ||
              (q.sender === m.receiver && q.receiver === m.sender)
            );
          });
        }
        return true;
      });
      return filtered;
    });
  },
};

export const Group = {
  create: async (groupData) => {
    await connectDB();
    if (!useFallback) {
      try {
        return await GroupMongoose.create(groupData);
      } catch (err) {
        useFallback = true;
      }
    }
    const dbData = readDB();
    const newGroup = {
      ...groupData,
      _id: Math.random().toString(36).substring(2, 15),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    if (!dbData.groups) dbData.groups = [];
    dbData.groups.push(newGroup);
    writeDB(dbData);
    return newGroup;
  },

  find: (query) => {
    return new QueryThenable(async () => {
      if (!useFallback) {
        try {
          return await GroupMongoose.find(query);
        } catch (err) {
          useFallback = true;
        }
      }
      const dbData = readDB();
      if (!dbData.groups) dbData.groups = [];
      let filtered = dbData.groups;
      if (query) {
        filtered = dbData.groups.filter((g) => {
          return Object.entries(query).every(([key, val]) => {
            if (key === "members") {
              if (val && typeof val === "object" && "$in" in val) {
                const searchMember = val.$in[0];
                return g.members?.includes(searchMember);
              }
              return g.members?.includes(val);
            }
            return g[key] === val;
          });
        });
      }
      return filtered;
    });
  },

  findById: (id) => {
    return new QueryThenable(async () => {
      if (!useFallback) {
        try {
          return await GroupMongoose.findById(id);
        } catch (err) {
          useFallback = true;
        }
      }
      const dbData = readDB();
      if (!dbData.groups) dbData.groups = [];
      const idStr = id?.toString();
      const group = dbData.groups.find((g) => g._id === idStr);
      return group || null;
    });
  },
};