import { scrypt, createCipheriv, randomBytes, createDecipheriv } from 'crypto';

export class Encryption {
  static encrypt(text: string): Promise<string> {
    const iv = randomBytes(16);
    const salt = randomBytes(32).toString('hex');

    return new Promise((resolve, reject) => {
      scrypt(
        process.env.ENCRYPTION_PASSPHRASE as string,
        salt,
        +(process.env.ENCRYPTION_KEYLEN as string),
        (err, key) => {
          if (err) reject(err);

          const cipher = createCipheriv(
            process.env.ENCRYPTION_ALGORITHM as string,
            key,
            iv
          );

          let encrypted = cipher.update(text, 'utf8', 'hex');
          encrypted += cipher.final('hex');

          resolve(this.mergeData(iv.toString('hex'), salt, encrypted));
        }
      );
    });
  }

  static decrypt(encryptedData: string) {
    const { encryptedText, iv: IV, salt } = this.splitData(encryptedData);

    return new Promise((resolve, reject) => {
      scrypt(
        process.env.ENCRYPTION_PASSPHRASE as string,
        salt,
        +(process.env.ENCRYPTION_KEYLEN as string),
        (err, key) => {
          if (err) reject(err);

          const iv = Buffer.from(IV, 'hex');
          const decipher = createDecipheriv(
            process.env.ENCRYPTION_ALGORITHM as string,
            key,
            iv
          );
          let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
          decrypted += decipher.final('utf8');

          resolve(decrypted);
        }
      );
    });
  }

  static mergeData(iv: string, salt: string, encryptedText: string) {
    const encryptedTextPart1 = encryptedText.slice(
      0,
      +(process.env.ENCRYPTED_DATA_START as string)
    );
    const encryptedTextPart2 = encryptedText.slice(
      +(process.env.ENCRYPTED_DATA_START as string)
    );

    return `${encryptedTextPart2 + salt + iv + encryptedTextPart1}`;
  }

  static splitData(encryptedData: string) {
    const encryptedText =
      encryptedData.slice(+(process.env.ENCRYPTED_END_POSITION as string)) +
      encryptedData.slice(0, +(process.env.ENCRYPTED_START_POSITION as string));

    const salt = encryptedData.slice(
      +(process.env.ENCRYPTED_START_POSITION as string),
      +(process.env.ENCRYPTED_MIDDLE_POSITION as string)
    );

    const iv = encryptedData.slice(
      +(process.env.ENCRYPTED_MIDDLE_POSITION as string),
      +(process.env.ENCRYPTED_END_POSITION as string)
    );

    return { encryptedText, iv, salt };
  }
}
