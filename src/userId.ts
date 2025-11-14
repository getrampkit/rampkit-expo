import * as SecureStore from "expo-secure-store";
import * as Crypto from "expo-crypto";

export const RAMPKIT_USER_ID_KEY = "rk_user_id";

export async function getRampKitUserId(): Promise<string> {
	const existing = await SecureStore.getItemAsync(RAMPKIT_USER_ID_KEY);
	if (existing && typeof existing === "string" && existing.length > 0) {
		return existing;
	}
	const newId = await generateUuidV4();
	try {
		console.log("[RampKit] UserId: created", newId);
	} catch {}
	await SecureStore.setItemAsync(RAMPKIT_USER_ID_KEY, newId);
	return newId;
}

async function generateUuidV4(): Promise<string> {
	try {
		const bytes = (await Crypto.getRandomBytesAsync(16)) as Uint8Array;
		// Set version (0100) and variant (10)
		bytes[6] = (bytes[6] & 0x0f) | 0x40;
		bytes[8] = (bytes[8] & 0x3f) | 0x80;
		const hex: string[] = Array.from(bytes as Uint8Array).map((b: number) =>
			b.toString(16).padStart(2, "0")
		);
		return (
			hex[0] + hex[1] + hex[2] + hex[3] + "-" +
			hex[4] + hex[5] + "-" +
			hex[6] + hex[7] + "-" +
			hex[8] + hex[9] + "-" +
			hex[10] + hex[11] + hex[12] + hex[13] + hex[14] + hex[15]
		);
	} catch {
		// Last-resort fallback using Math.random. Not cryptographically strong, but avoids crashes.
		const randByte = () => Math.floor(Math.random() * 256);
		const bytes = new Uint8Array(16);
		for (let i = 0; i < 16; i++) bytes[i] = randByte();
		bytes[6] = (bytes[6] & 0x0f) | 0x40;
		bytes[8] = (bytes[8] & 0x3f) | 0x80;
		const hex: string[] = Array.from(bytes as Uint8Array).map((b: number) =>
			b.toString(16).padStart(2, "0")
		);
		return (
			hex[0] + hex[1] + hex[2] + hex[3] + "-" +
			hex[4] + hex[5] + "-" +
			hex[6] + hex[7] + "-" +
			hex[8] + hex[9] + "-" +
			hex[10] + hex[11] + hex[12] + hex[13] + hex[14] + hex[15]
		);
	}
}


