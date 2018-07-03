# registry-link

The CSV-over-SFTP exchange with the external company registry and UBO data provider.

## Things to know

- The provider has changed its file format twice and versions nothing. The generation is
  sniffed from the header; all three still have to parse, because the archive is
  reprocessed.
- From the 2024 format onward every row carries a beneficial owner's name. That is
  personal data, and it is need-to-know inside the KYC function.
- A drop that fails to parse is left in the inbound directory and the run continues. Do not
  make a bad file stall the exchange.
