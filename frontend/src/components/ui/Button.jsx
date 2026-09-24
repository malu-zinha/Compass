import { cx } from './cx';
import styles from './Button.module.css';

/*
 * variant: primary | secondary | ghost | danger
 * size: sm | md | lg
 * iconOnly exige aria-label: sem texto visível, é o único nome do botão.
 */
export default function Button({
  as: Component = 'button',
  variant = 'secondary',
  size = 'md',
  icon,
  iconOnly = false,
  loading = false,
  disabled,
  className,
  children,
  type,
  ...rest
}) {
  const isButton = Component === 'button';
  return (
    <Component
      type={isButton ? type ?? 'button' : undefined}
      disabled={isButton ? disabled || loading : undefined}
      aria-disabled={!isButton && (disabled || loading) ? true : undefined}
      aria-busy={loading || undefined}
      className={cx(
        styles.button,
        styles[variant],
        styles[size],
        iconOnly && styles.iconOnly,
        loading && styles.loading,
        className,
      )}
      {...rest}
    >
      {loading ? <span className={styles.spinner} aria-hidden="true" /> : icon}
      {!iconOnly && children}
    </Component>
  );
}
