type Props = {
  text: string;
  /** When true, keep system cursor on this control. */
  disableCursor?: boolean;
};

/** Letter-stack hover effect — akashrmalhotra/3d-portfolio structure. */
const HoverLinks = ({ text, disableCursor = true }: Props) => {
  return (
    <div
      className="hover-link"
      data-cursor={disableCursor ? "disable" : undefined}
    >
      <div className="hover-in">
        {text}{" "}
        <div aria-hidden>{text}</div>
      </div>
    </div>
  );
};

export default HoverLinks;
