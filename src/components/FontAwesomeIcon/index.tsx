import { IconDefinition } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon as FontAwesome } from '@fortawesome/react-fontawesome';

interface FontAwesomeIcon {
    icon: IconDefinition;
    width: number;
    height: number;
    color: string;
}

const FontAwesomeIcon = ({ icon, width, height, color }: FontAwesomeIcon) => {
    return (
        <FontAwesome
            style={{
                width: width,
                height: height,
                color: color,
            }}
            icon={icon}
        />
    );
};

export default FontAwesomeIcon;
