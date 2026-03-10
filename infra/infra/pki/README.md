# PKI Notes

This directory is reserved for hybrid X25519 + Kyber768 and Dilithium signing material.

- Generate root and intermediate authorities offline.
- Issue service certificates per Cloud Run service.
- Rotate certificates at 80 percent of lifetime.
- Keep long-lived signing material out of the repository.
