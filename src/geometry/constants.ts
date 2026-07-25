export const GEOMETRIC_EPSILON = 0.001;
export const INTERSECTION_EPSILON = 0.01;
export const LENGTH_EPSILON = 1e-10;
export const SVG_PRECISION = 2;
export const DETERMINANT_EPSILON = 0.001;

// Bézier-specific numerical tolerances
export const BEZIER_LENGTH_TOLERANCE = 1e-10;      // Adaptive Simpson integration tolerance (L-space)
export const BEZIER_LENGTH_MAX_RECURSION = 20;     // Max recursion depth for adaptive Simpson
export const BEZIER_ROOT_EPSILON = 1e-12;          // Root inclusion/discriminant tolerance for bounding boxes
export const BEZIER_PARAMETER_TOLERANCE = 1e-12;   // Parameter convergence tolerance (u-space)
export const BEZIER_DERIVATIVE_EPSILON = 1e-14;    // Derivative magnitude threshold for Newton step
export const BEZIER_MAX_NEWTON_ITERATIONS = 30;    // Max Newton-Raphson iterations for arc-length inversion