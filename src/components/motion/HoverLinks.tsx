type Props = {
  text: string;
  /** When true, keep system cursor on this control. */
  disableCursor?: boolean;
};

/** Letter-stack hover effect inspired by akashrmalhotra/3d-portfolio. */
const HoverLinks = ({ text, disableCursor = true }: Props) => {
  return (
    <span
      className="hover-link"
      data-cursor={disableCursor ? "disable" : undefined}
    >
      <span className="hover-in">
        {text}
        <span className="hover-dup" aria-hidden>
          {text}
        </span>
      </span>
    </span>
  );
};

export default HoverLinks;
