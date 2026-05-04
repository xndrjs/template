import type { NodePlopAPI } from "node-plop";
import { applyCommonPlopSetup } from "./plop-register-common.ts";
import registerFeatureCoreGenerator from "./generators/feature-core.ts";
import registerFeatureCoreDomainPrimitiveGenerator from "./generators/feature-core-domain-primitive.ts";
import registerFeatureCoreDomainShapeGenerator from "./generators/feature-core-domain-shape.ts";
import registerFeatureCoreProofGenerator from "./generators/feature-core-proof.ts";
import registerFeatureCoreUseCaseGenerator from "./generators/feature-core-use-case.ts";
import registerFeatureCorePortGenerator from "./generators/feature-core-port.ts";
import registerFeatureCoreServiceGenerator from "./generators/feature-core-service.ts";
import registerFeatureCoreCapabilityGenerator from "./generators/feature-core-capability.ts";
import registerFeatureInfrastructureDrivenPackageGenerator from "./generators/feature-infrastructure-driven-package.ts";
import registerFeatureCompositionAppGenerator from "./generators/feature-composition-app.ts";
import registerCompositionWireUseCasesGenerator from "./generators/composition-wire-use-cases.ts";

export function registerPlopGenerators(plop: NodePlopAPI) {
  registerFeatureCoreGenerator(plop);
  registerFeatureInfrastructureDrivenPackageGenerator(plop);
  registerFeatureCompositionAppGenerator(plop);
  registerCompositionWireUseCasesGenerator(plop);
  registerFeatureCoreDomainPrimitiveGenerator(plop);
  registerFeatureCoreDomainShapeGenerator(plop);
  registerFeatureCoreProofGenerator(plop);
  registerFeatureCoreUseCaseGenerator(plop);
  registerFeatureCorePortGenerator(plop);
  registerFeatureCoreServiceGenerator(plop);
  registerFeatureCoreCapabilityGenerator(plop);
}

export default function (plop: NodePlopAPI) {
  applyCommonPlopSetup(plop);
  registerPlopGenerators(plop);
}
