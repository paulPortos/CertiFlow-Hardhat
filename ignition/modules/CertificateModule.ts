import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const CertificateModule = buildModule("CertificateModule", (m) => {
  // This deploys the CertificateRegistry contract
  const registry = m.contract("CertificateRegistry");

  return { registry };
});

export default CertificateModule;