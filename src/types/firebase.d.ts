/// <reference types="firebase" />

import { FirebaseApp } from "firebase/app";
import { Auth } from "firebase/auth";
import { Firestore } from "firebase/firestore";
import { FirebaseStorage } from "firebase/storage";
import { Database } from "firebase/database";

declare module "firebase" {
  export * from "firebase/app";
  export * from "firebase/auth";
  export * from "firebase/firestore";
  export * from "firebase/storage";
  export * from "firebase/database";
}

declare module "firebase/app" {
  export function initializeApp(options: any): FirebaseApp;
  export function getApp(): FirebaseApp;
  export function getApps(): FirebaseApp[];
}

declare module "firebase/auth" {
  export function getAuth(app?: FirebaseApp): Auth;
  export function signInWithEmailAndPassword(
    auth: Auth,
    email: string,
    password: string,
  ): Promise<any>;
  export function createUserWithEmailAndPassword(
    auth: Auth,
    email: string,
    password: string,
  ): Promise<any>;
  export function signOut(auth: Auth): Promise<void>;
}

declare module "firebase/firestore" {
  export function getFirestore(app?: FirebaseApp): Firestore;
  export function collection(firestore: Firestore, path: string): any;
  export function doc(
    firestore: Firestore,
    path: string,
    ...pathSegments: string[]
  ): any;
  export function getDoc(docRef: any): Promise<any>;
  export function getDocs(query: any): Promise<any>;
  export function setDoc(docRef: any, data: any): Promise<void>;
  export function updateDoc(docRef: any, data: any): Promise<void>;
  export function deleteDoc(docRef: any): Promise<void>;
}

declare module "firebase/storage" {
  export function getStorage(app?: FirebaseApp): FirebaseStorage;
  export function ref(storage: FirebaseStorage, path: string): any;
  export function uploadBytes(ref: any, data: any): Promise<any>;
  export function getDownloadURL(ref: any): Promise<string>;
}

declare module "firebase/database" {
  export function getDatabase(app?: FirebaseApp): Database;
  export function ref(database: Database, path: string): any;
  export function get(query: any): Promise<any>;
  export function set(ref: any, data: any): Promise<void>;
  export function update(ref: any, data: any): Promise<void>;
  export function remove(ref: any): Promise<void>;
}

declare module "firebase/functions" {
  export * from "@firebase/functions-types";
}

declare module "firebase/messaging" {
  export * from "@firebase/messaging-types";
}

declare module "firebase/analytics" {
  export * from "@firebase/analytics-types";
}

declare module "firebase/performance" {
  export * from "@firebase/performance-types";
}

declare module "firebase/remote-config" {
  export * from "@firebase/remote-config-types";
}
