import CryptoJS from 'crypto-js';

const KEY = process.env.REACT_APP_PAYLOAD_KEY || 'fallback-dev-key';

/**
 * 加密任意对象，返回 base64 密文字符串
 * 每次调用生成随机 IV，防止重放攻击
 */
export const encryptPayload = (obj) => {
  const iv  = CryptoJS.lib.WordArray.random(16);
  const key = CryptoJS.enc.Utf8.parse(KEY.padEnd(32, '0').slice(0, 32));

  const encrypted = CryptoJS.AES.encrypt(
    JSON.stringify(obj),
    key,
    { iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 }
  );

  // 将 IV 和密文拼在一起：iv(hex) + ':' + ciphertext(base64)
  return iv.toString(CryptoJS.enc.Hex) + ':' + encrypted.toString();
};
