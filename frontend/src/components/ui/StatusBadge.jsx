import Chip from './Chip';
import { interviewStatus } from '../../lib/status';

export default function StatusBadge({ status, ...rest }) {
  const { label, tone } = interviewStatus(status);
  return <Chip tone={tone} {...rest}>{label}</Chip>;
}
