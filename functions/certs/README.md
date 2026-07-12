# Apple root certificates

`appleVerification.ts` loads every `.cer` file in this folder to verify the
signature chain of StoreKit 2 signed transactions.

Download Apple's public root certificates from
https://www.apple.com/certificateauthority/ (the G3 root, currently
`AppleRootCA-G3.cer`) and place the file(s) here. These are Apple's public
certificates, not secrets — safe to commit.
