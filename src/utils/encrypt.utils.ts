import crypto from 'crypto';

export class Encrypt {
  private algorithm = process.env.encryptionAlgorithm;
  private key = Buffer.from(process.env.ENCRYPTION_KEY as string);

  encryptBVN(bvn: string) {
    return new Promise((resolve, reject) => {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(
        this.algorithm as string,
        this.key,
        iv
      );

      let encrypted = '';

      cipher.setEncoding('hex');

      cipher.once('data', (dataChunk: string) => {
        encrypted += dataChunk;
      });

      cipher.once('end', () => {
        resolve(`${iv.toString('hex') + ':' + encrypted}`);
      });
      cipher.once('error', (err) => {
        reject(err);
      });
    });
  }

  decryptBVN(encryptedData: string, iv: string) {
    const decipher = crypto.createDecipheriv(
      this.algorithm as string,
      Buffer.from(process.env.ENCRYPTION_KEY as string),
      Buffer.from(iv, 'hex')
    );
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
}
